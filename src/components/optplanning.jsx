

const CAP_POSTE_MAX    = 7000;
const MALUS_CHGT       = 15;
const CAP_POSTE_MIN    = 500;
const POSTES_JOUR      = ["matin","apres_midi","nuit"];
const POIDS_PRIO       = {critique:100, urgent:60, normal:20};
const MALUS_RETARD     = 8;
const STOCK_SECURITE_J = 1;
const DATE_LIVRAISON_DEFAUT_J = 30; // si pas de date livraison, on donne 30 jours

// Retourne "YYYY-MM-DD" dans le fuseau local (évite le décalage UTC de toISOString)
const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function optimiserPlanningIA({cpf=[], lots=[], arts=[]}) {
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const todayS = toLocalDateStr(today);

  // ── 1. Extraire les besoins depuis CPF validées ────────────────
  const CPF_PROD = ["validated_chef_commercial","validated","planned","in_production"];
  const cmdsProd = cpf.filter(c => CPF_PROD.includes(c.status));

  const besoinsMap = {};
  cmdsProd.forEach(cmd => {
    const dateLiv = cmd.dateLivraison || toLocalDateStr(
      new Date(today.getTime() + DATE_LIVRAISON_DEFAUT_J * 86400000)
    );

    (cmd.items || []).forEach(item => {
      if (!item.artId) return;
      if (!besoinsMap[item.artId]) {
        besoinsMap[item.artId] = {
          artId:      item.artId,
          qteTotale:  0,
          cmdIds:     [],
          dateLivMin: dateLiv,
          prioriteMax:"normal",
        };
      }
      const b = besoinsMap[item.artId];
      b.qteTotale += Number(item.qty) || 0;
      if (!b.cmdIds.includes(cmd.id)) b.cmdIds.push(cmd.id);
      b.cmdNums = b.cmdNums || {};
      b.cmdNums[cmd.id] = cmd.number || cmd.id;
      
      if ((POIDS_PRIO[cmd.priorite||"normal"] || 0) > (POIDS_PRIO[b.prioriteMax] || 0))
        b.prioriteMax = cmd.priorite || "normal";
        
      if (dateLiv < b.dateLivMin) b.dateLivMin = dateLiv;
    });
  });

  // ── 2. Stock disponible (par produit) ─────────────────────────
  const stockParArt = {};
  lots.filter(l => l.status === "available" && l.qcStatus !== "bloque").forEach(l => {
    const artKey = l.artId || l.product_id;
    if (artKey) stockParArt[artKey] = (stockParArt[artKey] || 0) + (l.availQty || l.avail_qty || 0);
  });

  // ── 3. Calculer besoins nets ───────────────────────────────────
  const besoins = Object.values(besoinsMap)
    .map(b => {
      const stockBrut  = stockParArt[b.artId] || 0;
      const stockDispo = Math.max(0, stockBrut - CAP_POSTE_MIN * STOCK_SECURITE_J);
      const qteNetteAProd = Math.max(0, b.qteTotale - stockDispo);
      const art = arts.find(a => a.id === b.artId);
      const urgenceJours = Math.max(0, Math.ceil((new Date(b.dateLivMin) - today) / 86400000));
      return {
        ...b,
        artCode:         art?.ref || art?.code || b.artId,
        artNom:          art?.name || "",
        stockDispo,
        qteNetteAProd,
        urgenceJours,
        cmdNums:         b.cmdNums || {},
      };
    })
    .filter(b => b.qteNetteAProd > 0)
    .sort((a, b) => {
      const dp = (POIDS_PRIO[b.prioriteMax]||0) - (POIDS_PRIO[a.prioriteMax]||0);
      if (dp !== 0) return dp;
      if (a.urgenceJours !== b.urgenceJours) return a.urgenceJours - b.urgenceJours;
      return b.qteNetteAProd - a.qteNetteAProd;
    });

  // ── 4. Bin-packing avec map de capacité ────────────────────────
  // ── 4. Bin-packing avec map de capacité ────────────────────────
  const capMap = {};
  const getPoste = (dateStr, poste) => {
    if (!capMap[dateStr]) capMap[dateStr] = {};
    if (!capMap[dateStr][poste]) capMap[dateStr][poste] = { usedQty: 0, artIds: new Set() };
    return capMap[dateStr][poste];
  };

  const planning = [];

  for (const besoin of besoins) {
    let qteRestante = besoin.qteNetteAProd;
    
    // On garde la logique de départ, mais on va la filtrer plus bas
    let startDay = Math.max(0, besoin.urgenceJours - 2);

    while (qteRestante > 0) {
      let placed = false;

      for (let d = startDay; d <= startDay + 14; d++) {
        // Calcul de la date cible en fuseau local (pas UTC)
        const cibleDate = new Date(today.getTime() + d * 86400000);
        const dateStr = toLocalDateStr(cibleDate);

        // 🚨 SÉCURITÉ ABSOLUE : Si la date générée est STRICTEMENT inférieure à aujourd'hui 
        // (ou si la boucle a glissé à cause d'un décalage horaire), on force la date du jour.
        if (dateStr < todayS) {
          continue; // On passe au jour suivant pour ne pas planifier hier
        }

        for (const poste of POSTES_JOUR) {
          const slot = getPoste(dateStr, poste);
          const capDispo = CAP_POSTE_MAX - slot.usedQty;
          if (capDispo <= 0) continue;

          const autreArtPresent = slot.artIds.size > 0 && !slot.artIds.has(besoin.artId);
          if (autreArtPresent && slot.usedQty > CAP_POSTE_MAX * 0.5) continue;

          const qtePostee = Math.min(qteRestante, capDispo);

          planning.push({
            id:          `pl_${besoin.artId}_${dateStr}_${poste}_${Date.now()}${Math.random()}`,
            dateProd:    dateStr, // Sera forcément >= todayS
            poste,
            artId:       besoin.artId,
            article:     besoin.artCode,
            artNom:      besoin.artNom,
            qty:         qtePostee,
            status:      "planned",
            estCritique: besoin.prioriteMax === "critique",
            commandeIds: besoin.cmdIds,
            priorite:    besoin.prioriteMax,
            dateLivMin:  besoin.dateLivMin,
            urgenceJours:besoin.urgenceJours,
            validCC:     false,
            validCU:     false,
            nbChang:     0,
            iaScore:     0,
          });

          slot.usedQty += qtePostee;
          slot.artIds.add(besoin.artId);
          qteRestante -= qtePostee;
          placed = true;
          if (qteRestante <= 0) break;
        }
        if (qteRestante <= 0) break;
      }
      if (!placed) break; 
    }
  }

  // ── 5. Calculer nbChang et iaScore par poste ──────────────────
  const groupsPoste = {};
  planning.forEach(p => {
    const k = `${p.dateProd}|${p.poste}`;
    if (!groupsPoste[k]) groupsPoste[k] = [];
    groupsPoste[k].push(p);
  });

  Object.values(groupsPoste).forEach(lignes => {
    const nbArticlesDiff = new Set(lignes.map(l => l.artId)).size;
    const nbChang = Math.max(0, nbArticlesDiff - 1);
    const retardJours = Math.max(0, ...lignes.map(l =>
      Math.max(0, -Math.ceil((new Date(l.dateLivMin) - today) / 86400000))
    ));
    const score = Math.max(0, 100 - nbChang * MALUS_CHGT - retardJours * MALUS_RETARD);
    lignes.forEach(l => { l.nbChang = nbChang; l.iaScore = score; });
  });

  // ── 6. Statistiques globales ──────────────────────────────────
  const totalPcs     = planning.reduce((s, p) => s + p.qty, 0);
  const totalPostes  = Object.keys(groupsPoste).length;
  const totalChangts = Object.values(groupsPoste).filter(l => l[0].nbChang > 0).length;
  const scoreMoyen   = planning.length > 0
    ? Math.round(planning.reduce((s, p) => s + p.iaScore, 0) / planning.length)
    : 0;
  const nbCritiques  = planning.filter(p => p.estCritique).length;
  const tempsSauvé   = totalChangts > 0 ? `~${totalChangts * 25}min` : "0min";

  return {
    planning,
    stats: {
      totalPcs, totalPostes, totalChangts, scoreMoyen,
      nbCritiques, besoinsCouverts: besoins.length,
      besoinsTotal: Object.keys(besoinsMap).length,
      tempsSauvé,
      besoins,
    }
  };
}