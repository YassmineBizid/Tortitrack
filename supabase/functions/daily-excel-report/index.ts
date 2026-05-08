// supabase/functions/daily-excel-report/index.ts
// Deploy: supabase functions deploy daily-excel-report
// Secrets: RESEND_API_KEY, REPORT_EMAIL, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

const REASONS: Record<string,string> = {
  moisissure_avant_dlc_pv: "Moisissure avant DLC — PV",
  produit_abime_client:    "Produit abîmé chez client",
  produit_abime_camion:    "Produit abîmé camion",
  moisissure_camion:       "Moisissure camion",
  dlc_atteint_camion:      "DLC atteint camion",
  dlc_atteint_pv:          "DLC atteint PV",
};

const fmtD = (d: string|null) => d ? new Date(d).toLocaleDateString("fr-TN",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const dLeft = (d: string|null) => d ? Math.ceil((new Date(d).getTime()-Date.now())/86400000) : null;

function genExcel(bls: any[], brs: any[], label: string): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet BL
  const blH = ["N° BL","Date","Vendeur","Tél","Véhicule","Réf","Article","Code-barres","Lot","Date Fab.","DLC","Jours DLC","Qté","URL Photo","IA","Statut"];
  const blR: any[][] = [blH];
  for (const d of bls) {
    const v = d.vendor_snapshot||{};
    for (const l of (d.delivery_lines||[])) {
      blR.push([d.number,d.date,v.name||"",v.phone||"",v.vehicle_plate||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",fmtD(l.manufacture_date),fmtD(l.expiry_date),dLeft(l.expiry_date)??"—",l.quantity||0,l.photo_url||"",l.ai_analyzed?"Oui":"Non",d.status]);
    }
  }
  const wsBL = XLSX.utils.aoa_to_sheet(blR);
  wsBL["!cols"]=[18,12,22,14,14,12,32,18,12,14,12,10,8,60,8,10].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb,wsBL,"Bons de Livraison");

  // Sheet BR
  const brH = ["N° BR","Date","Vendeur","Tél","Véhicule","Client","Tél Client","Réf","Article","Code-barres","Lot","Date Fab.","DLC","Qté","Cause Retour","Défaut IA","Confiance %","URL Photo","Validé Opérateur","Statut"];
  const brR: any[][] = [brH];
  for (const d of brs) {
    const v = d.vendor_snapshot||{};
    for (const l of (d.return_lines||[])) {
      brR.push([d.number,d.date,v.name||"",v.phone||"",v.vehicle_plate||"",d.client_name||"",d.client_phone||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",fmtD(l.manufacture_date),fmtD(l.expiry_date),l.quantity||0,REASONS[l.reason]||l.reason||"",l.ai_explanation||"",l.ai_confidence??""  ,l.photo_url||"",l.ai_validated_by_operator?"Oui":"Non",d.status]);
    }
  }
  const wsBR = XLSX.utils.aoa_to_sheet(brR);
  wsBR["!cols"]=[18,12,22,14,14,20,14,12,32,18,12,14,12,8,36,44,12,60,14,10].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb,wsBR,"Bons de Retour");

  // Sheet Summary
  const totalChg=bls.reduce((s,d)=>(d.delivery_lines||[]).reduce((a:number,l:any)=>a+(l.quantity||0),0)+s,0);
  const totalRet=brs.reduce((s,d)=>(d.return_lines||[]).reduce((a:number,l:any)=>a+(l.quantity||0),0)+s,0);
  const tx=totalChg>0?((totalRet/totalChg)*100).toFixed(1)+"%":"0%";
  const sumD=[
    ["RAPPORT QUOTIDIEN — BT FOOD INDUSTRY"],["Module Sortie & Retour PF"],[""],
    ["Période",label],["Généré le",new Date().toLocaleString("fr-TN")],[""],
    ["LIVRAISONS"],["BL total",bls.length],["Unités chargées",totalChg],[""],
    ["RETOURS"],["BR total",brs.length],["Unités retournées",totalRet],["Taux retour",tx],[""],
    ["MOTIFS DE RETOUR"],
    ...Object.entries(REASONS).map(([id,lbl])=>[lbl,brs.reduce((s,d)=>(d.return_lines||[]).filter((l:any)=>l.reason===id).reduce((a:number,l:any)=>a+(l.quantity||0),0)+s,0)]),
    [""],["PHOTOS CLOUD"],
    ["Photos BL",bls.reduce((s,d)=>(d.delivery_lines||[]).filter((l:any)=>l.photo_url).length+s,0)],
    ["Photos BR",brs.reduce((s,d)=>(d.return_lines||[]).filter((l:any)=>l.photo_url).length+s,0)],
    ["","URLs dans colonnes 'URL Photo' des onglets BL et BR"],
  ];
  const wsSum=XLSX.utils.aoa_to_sheet(sumD);
  wsSum["!cols"]=[{wch:40},{wch:22}];
  XLSX.utils.book_append_sheet(wb,wsSum,"Résumé");

  return XLSX.write(wb,{type:"array",bookType:"xlsx"}) as Uint8Array;
}

async function sendViaResend(to: string, buffer: Uint8Array, date: string, stats: any) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY manquante");
  const b64 = btoa(String.fromCharCode(...buffer));
  const txColor = parseFloat(stats.tx)>5?"#BB0000":parseFloat(stats.tx)>2?"#E9730C":"#107E3E";
  const res = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from:"BTFI Fleet Manager <noreply@btfood.tn>",
      to:[to],
      subject:`[BTFI] Rapport quotidien — ${date}`,
      html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#354A5E;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">📊 Rapport Quotidien · BT Food Industry</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:12px">${date}</p>
        </div>
        <div style="background:#F5F6F7;padding:20px;border:1px solid #D9DBDD;border-top:none">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr style="background:#0070F2;color:#fff"><th style="padding:10px;text-align:left">Indicateur</th><th style="padding:10px;text-align:right">Valeur</th></tr>
            <tr><td style="padding:9px;border-bottom:1px solid #EFF1F2">Bons de Livraison</td><td style="padding:9px;text-align:right;font-weight:700;border-bottom:1px solid #EFF1F2">${stats.bl}</td></tr>
            <tr><td style="padding:9px;border-bottom:1px solid #EFF1F2">Unités chargées</td><td style="padding:9px;text-align:right;border-bottom:1px solid #EFF1F2">${stats.chg}</td></tr>
            <tr><td style="padding:9px;border-bottom:1px solid #EFF1F2;color:#BB0000">Bons de Retour</td><td style="padding:9px;text-align:right;font-weight:700;border-bottom:1px solid #EFF1F2;color:#BB0000">${stats.br}</td></tr>
            <tr><td style="padding:9px;border-bottom:1px solid #EFF1F2;color:#BB0000">Unités retournées</td><td style="padding:9px;text-align:right;border-bottom:1px solid #EFF1F2;color:#BB0000">${stats.ret}</td></tr>
            <tr><td style="padding:9px">Taux de retour</td><td style="padding:9px;text-align:right;font-weight:700;color:${txColor}">${stats.tx}</td></tr>
          </table>
          <p style="font-size:12px;color:#89919A;margin-top:14px">📎 Fichier Excel en pièce jointe avec tous les détails et <strong>liens vers les photos</strong> stockées dans le cloud.</p>
        </div>
        <div style="background:#EBECEE;padding:10px;text-align:center;font-size:10px;color:#89919A;border-radius:0 0 8px 8px">BT Food Industry · MF 1887237 G.A.M 000 · Envoi automatique quotidien à minuit</div>
      </div>`,
      attachments:[{filename:`BTFI_Rapport_${date.replace(/ /g,"_")}.xlsx`,content:b64}],
    }),
  });
  if(!res.ok){const e=await res.text();throw new Error(`Resend ${res.status}: ${e}`);}
}

serve(async(req: Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:CORS});
  try{
    // Auth: either cron secret header or Supabase JWT
    const cronSecret=req.headers.get("x-cron-secret");
    const authHeader=req.headers.get("Authorization");
    const validCron=cronSecret===Deno.env.get("CRON_SECRET");
    if(!validCron&&!authHeader)return new Response(JSON.stringify({error:"Non autorisé"}),{status:401,headers:CORS});

    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const{data:settingData}=await supabase.from("app_settings").select("value").eq("key","gm_email").single();
    const recipientEmail=Deno.env.get("REPORT_EMAIL")||settingData?.value||"direction@btfood.tn";

    const body=req.method==="POST"?await req.json().catch(()=>({})):{};
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const from=body.date_from||yesterday.toISOString().split("T")[0];
    const to=body.date_to||from;
    const label=from===to?from:`${from} au ${to}`;

    const[{data:bls,error:e1},{data:brs,error:e2}]=await Promise.all([
      supabase.from("delivery_orders").select("*,delivery_lines(*)").gte("date",from).lte("date",to).neq("status","draft").order("date"),
      supabase.from("return_orders").select("*,return_lines(*)").gte("date",from).lte("date",to).neq("status","draft").order("date"),
    ]);
    if(e1)throw e1;if(e2)throw e2;

    const totalChg=(bls||[]).reduce((s,d)=>(d.delivery_lines||[]).reduce((a:number,l:any)=>a+(l.quantity||0),0)+s,0);
    const totalRet=(brs||[]).reduce((s,d)=>(d.return_lines||[]).reduce((a:number,l:any)=>a+(l.quantity||0),0)+s,0);
    const tx=totalChg>0?((totalRet/totalChg)*100).toFixed(1)+"%":"0%";

    const buffer=genExcel(bls||[],brs||[],label);
    await sendViaResend(recipientEmail,buffer,label,{bl:bls?.length||0,br:brs?.length||0,chg:totalChg,ret:totalRet,tx});

    // Log
    await supabase.from("email_log").insert({document_type:"BR",document_id:crypto.randomUUID(),document_number:`RAPPORT-${from}`,recipient_email:recipientEmail,status:"auto"}).catch(()=>{});

    return new Response(JSON.stringify({success:true,date:label,recipient:recipientEmail,bls:bls?.length||0,brs:brs?.length||0}),{status:200,headers:CORS});
  }catch(e){
    console.error(e);
    return new Response(JSON.stringify({error:e instanceof Error?e.message:"Erreur"}),{status:500,headers:CORS});
  }
});
