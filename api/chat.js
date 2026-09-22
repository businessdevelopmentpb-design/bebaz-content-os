import { generateText } from 'ai';

function routePrompt(prompt=''){
  const p=prompt.toLowerCase();
  if(/campaign|kampanye|launch|grand opening|strategy|strategi|sales turun|penjualan turun|positioning|marketing plan/.test(p))
    return {route:'Strategic Workflow',complexity:'high'};
  if(/kenapa|analisis|analyze|audit|review|evaluasi|budget|persona|content plan|kalender konten|kompetitor/.test(p))
    return {route:'Analysis',complexity:'medium'};
  return {route:'General',complexity:'low'};
}
function systemPrompt(route,brand,mode){
  const ctx=[
    'Nama: '+(brand.name||'-'),
    'Kategori: '+(brand.category||'-'),
    'Produk: '+(brand.products||'-'),
    'Target: '+(brand.target||'-'),
    'Positioning: '+(brand.positioning||'-'),
    'Tone: '+(brand.tone||'-'),
    'Budget: '+(brand.budget||'-'),
    'Objective: '+(brand.objective||'-')
  ].join('\n');
  return [
    'Kamu adalah MarkeAI, AI Marketing Assistant senior untuk pasar Indonesia.',
    'Jawab dalam Bahasa Indonesia secara tajam, praktis, dan tidak generik.',
    'Mode: '+mode+'. Route: '+route+'.',
    'KONTEKS BRAND:\n'+ctx,
    'Prompt sederhana: jawab langsung seperti AI assistant premium.',
    'Analysis: jelaskan masalah, insight, dan rekomendasi.',
    'Strategic Workflow: gunakan DIAGNOSIS → STRATEGY → TACTICS → NEXT ACTIONS.',
    'Strategy wajib menyelesaikan diagnosis. Tactics wajib menjalankan strategy.',
    'Bedakan fakta, asumsi, dan rekomendasi. Jangan mengarang data pasar.'
  ].join('\n\n');
}
function fallback(prompt,route){
  if(route==='Strategic Workflow'){
    return [
      'DIAGNOSIS',
      'Brief: '+prompt,
      'Masalah perlu dipahami dari sisi objective bisnis, target audience, barrier, dan peluang.',
      '',
      'STRATEGY',
      'Fokuskan pada satu consumer tension, satu proposition, dan satu strategic direction yang jelas.',
      '',
      'TACTICS',
      '1. Hero campaign idea\n2. Social content\n3. Creator/influencer\n4. Activation\n5. Promo mechanic\n6. KPI per channel',
      '',
      'NEXT ACTIONS',
      'Lengkapi target, budget, lokasi, dan periode untuk hasil lebih presisi.'
    ].join('\n');
  }
  return 'Saya menangkap kebutuhan Anda: '+prompt+'\n\nTambahkan konteks brand, objective, audience, atau budget bila ingin hasil lebih presisi.';
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{}, prompt=body.prompt||'', brand=body.brand||{}, mode=body.mode||'Auto';
  if(!prompt.trim()) return res.status(400).json({error:'Prompt wajib diisi'});
  const meta=routePrompt(prompt);
  try{
    const result=await generateText({
      model:'openai/gpt-5.4',
      system:systemPrompt(meta.route,brand,mode),
      prompt:prompt
    });
    return res.status(200).json({...meta,text:result.text,model:'MarkeAI Auto'});
  }catch(err){
    console.error(err);
    return res.status(200).json({...meta,text:fallback(prompt,meta.route),model:'MVP fallback',warning:'AI Gateway Vercel belum aktif karena billing verification. Aktifkan billing atau gunakan API key provider agar AI real berjalan.'});
  }
}