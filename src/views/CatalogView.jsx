import { useState, useEffect } from "react";
import { Card, Btn, Input, Modal, Toast, Select } from "../components/ui.jsx"; 
import { sb } from "../supabaseClient.js";

export function CatalogView({ user, addAudit }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]); // 👈 Stockage des marques dispo
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [toast, setToast] = useState(null);
  
  // 👈 Ajout de brand_id à l'état initial
  const [form, setForm] = useState({ 
    barcode: "", ref: "", name: "", weight: "", category: "", shelf_life_days: 21, unit_price: 0, brand_id: "" 
  });

  // Chargement combiné des produits et des marques
  const load = async () => {
    setLoading(true);
    try {
      // 1. Charger les marques disponibles pour le formulaire
      const { data: brandsData } = await sb.from("brands").select("id, name").order("name");
      setBrands(brandsData || []);

      // 2. Charger les produits avec une jointure vers la table brands
      const { data: productsData } = await sb
        .from("products")
        .select(`
          *,
          brands (
            name
          )
        `)
        .eq("is_active", true)
        .order("ref");
        
      setProducts(productsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.ref || !form.name) {
      setToast({ msg: "⚠ Référence et Nom requis", color: "#dc2626" });
      return;
    }

    // Le payload SQL propre : pas d'objets imbriqués factices, juste l'id relationnel
    const payload = {
      barcode: form.barcode,
      ref: form.ref,
      name: form.name,
      weight: form.weight,
      category: form.category,
      brand_id: form.brand_id || null, // 👈 Envoi du brand_id (ou null si vide)
      shelf_life_days: parseInt(form.shelf_life_days) || 21,
      unit_price: parseFloat(form.unit_price) || 0,
    };

    try {
      if (showEdit) {
        await sb.from("products").update(payload).eq("id", showEdit.id);
        setToast({ msg: "✅ Produit modifié", color: "#059669" });
      } else {
        await sb.from("products").insert(payload);
        setToast({ msg: "✅ Produit ajouté", color: "#059669" });
      }
      setShowEdit(null);
      setShowAdd(false);
      load();
    } catch (e) {
      setToast({ msg: `❌ Erreur: ${e.message}`, color: "#dc2626" });
    }
  };

  const del = async (id, ref) => {
    if (!confirm(`Supprimer "${ref}" du catalogue ?`)) return;
    try {
      await sb.from("products").update({ is_active: false }).eq("id", id);
      setToast({ msg: "🗑 Produit supprimé", color: "#059669" });
      load();
    } catch (e) {
      setToast({ msg: `❌ Erreur: ${e.message}`, color: "#dc2626" });
    }
  };

  const openAdd = () => {
    setForm({ barcode: "", ref: "", name: "", weight: "", category: "", shelf_life_days: 21, unit_price: 0, brand_id: "" });
    setShowEdit(null);
    setShowAdd(true);
  };

  const openEdit = (p) => {
    setForm({
      ...p,
      brand_id: p.brand_id || "" // S'assurer que le champ n'est pas null pour l'élément HTML select
    });
    setShowEdit(p);
    setShowAdd(true);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-xs text-gray-400 mt-0.5">{products.length} article(s) · Prix unitaire · Reconnaissance IA</p>
        </div>
        <Btn variant="primary" size="sm" onClick={openAdd}>📦 Ajouter un produit</Btn>
      </div>

      <Card className="bg-blue-50 border border-blue-200">
        <div className="p-4 text-sm text-blue-800">
          <strong>📦 Info Catalogue :</strong> Ces produits alimentent les bons de livraison et de retour. Le prix unitaire sert au calcul du Chiffre d'Affaires et de la facturation.
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center text-gray-400">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
          <p className="text-sm">Chargement du catalogue…</p>
        </Card>
      ) : products.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-sm mb-3">Aucun produit pour l'instant</p>
          <Btn variant="secondary" size="sm" onClick={openAdd}>Créer le premier produit</Btn>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Référence</th>
                  <th className="text-left px-4 py-3">Code à barres</th>
                  <th className="text-left px-4 py-3">Marque</th> {/* 👈 Nouvelle colonne */}
                  <th className="text-left px-4 py-3">Produit</th>
                  <th className="text-center px-4 py-3">Format</th>
                  <th className="text-center px-4 py-3">Catégorie</th>
                  <th className="text-center px-4 py-3">DLC (j)</th>
                  <th className="text-right px-4 py-3">Prix (TND)</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3"><span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">{p.ref}</span></td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{p.barcode || "—"}</td>
                    {/* 👈 Affichage de la marque jointe */}
                    <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                      {p.brands?.name ? `🏷️ ${p.brands.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{p.weight || "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">{p.shelf_life_days || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{p.unit_price ? Number(p.unit_price).toFixed(3) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEdit(p)} className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition" title="Modifier">✏️</button>
                        <button onClick={() => del(p.id, p.ref)} className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition" title="Supprimer">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={showEdit ? "✏️ Modifier produit" : "📦 Nouveau produit"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
            {showEdit ? "Modifiez les informations du produit." : "Créez un nouveau produit pour le catalogue."}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Référence *" placeholder="TC21-01" value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} />
            <Input label="Code EAN" placeholder="3701234560011" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
          </div>

          <Input label="Nom du produit *" placeholder="Tortilla Classique" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          {/* 👈 Ajout du Sélecteur de Marque dans le formulaire */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Marque *</label>
            <select 
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              value={form.brand_id} 
              onChange={e => setForm({ ...form, brand_id: e.target.value })}
            >
              <option value="">-- Choisir une marque --</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Format / Poids" placeholder="250g" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
            <Input label="DLC théorique (jours)" type="number" value={form.shelf_life_days} onChange={e => setForm({ ...form, shelf_life_days: parseInt(e.target.value) || 21 })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Catégorie" placeholder="Tortilla" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <Input label="Prix unitaire (TND)" type="number" step="0.001" min="0" placeholder="0.000" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} />
          </div>

          <div className="flex gap-2">
            <Btn variant="success" onClick={save} className="flex-1">{showEdit ? "✓ Modifier" : "✓ Ajouter"}</Btn>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
