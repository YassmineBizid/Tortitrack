import { sb, SUPA_URL } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";

export async function uploadPhoto(base64, name) {
  const b64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], {type:"image/jpeg"});
  const path = `${new Date().getFullYear()}/${name}`;
  const {error} = await sb.storage.from("product-photos").upload(path, blob, {contentType:"image/jpeg", upsert:false});
  if (error) throw error;
  const {data:{publicUrl}} = sb.storage.from("product-photos").getPublicUrl(path);
  return {path, url: publicUrl};
}

export async function callAI(imageB64, prompt) {
  const session = (await sb.auth.getSession()).data.session;
  const token = session?.access_token;
  const res = await fetch(`${SUPA_URL}/functions/v1/ai-analyze`, {
    method: "POST",
    headers: {"Content-Type":"application/json", "Authorization":`Bearer ${token}`},
    body: JSON.stringify({image_b64: imageB64.includes(",") ? imageB64.split(",")[1] : imageB64, prompt})
  });
  if (!res.ok) throw new Error("AI error " + res.status);
  const {result} = await res.json();
  return result;
}

export function buildPrompt(products, isBR) {
  const cat = products.map(p => `${p.ref}|${p.barcode||p.code}|${p.name}`).join("; ");
  const rsn = RETURN_REASONS.map(r => `${r.id}:${r.label}`).join("; ");
  return `Expert FMCG avec capacités OCR. Analyse cette photo de produit alimentaire BT Food Industry.
Catalogue: ${cat}
Extrais: nom du produit, code-barres EAN, DLC (Date Limite Consommation), DF (Date Fabrication), numéro de lot.${isBR?`\nIdentifie aussi la cause de retour parmi: ${rsn}`:""}
JSON UNIQUEMENT:
{"ref":"<ref catalogue>","code":"<EAN>","name":"<nom>","dlc":"<YYYY-MM-DD>","df":"<YYYY-MM-DD>","lot":"<lot>","product_conf":<0-100>,"dates_conf":<0-100>${isBR?',"reason":"<id>","cause_conf":<0-100>,"defect":"<défaut visible>"':""}}
Mettre null si non visible.`;
}
