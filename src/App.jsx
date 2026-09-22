import React,{useEffect,useState} from 'react'
import {Home,MessageSquareText,BrainCircuit,FolderKanban,Settings,Send,Sparkles,Target,Search,PenTool,TrendingUp,FileText,Loader2,Save,CheckCircle2,Zap} from 'lucide-react'

const defaultBrand={name:'Kopi Senja',category:'F&B • Coffee Shop',products:'Coffee, non-coffee, light meals',target:'18–30 tahun, Jakarta',positioning:'Affordable hangout coffee dengan suasana cozy',tone:'Friendly, youthful, warm',budget:'Rp10.000.000 / bulan',objective:'Meningkatkan transaksi weekday'}
const seedProjects=[{id:1,title:'Grand Opening Kopi Senja',type:'Campaign Plan'},{id:2,title:'Konten Instagram Oktober',type:'Content Plan'},{id:3,title:'Analisis Coffee Shop Jakarta',type:'Research'}]
function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}
function persist(k,v){localStorage.setItem(k,JSON.stringify(v))}
export default function App(){
  const [page,setPage]=useState('home'),[mode,setMode]=useState('Auto'),[brand,setBrand]=useState(()=>load('markeai-brand',defaultBrand))
  const [projects,setProjects]=useState(()=>load('markeai-projects',seedProjects))
  const [messages,setMessages]=useState([{role:'assistant',text:'Hai! Saya MarkeAI. Prompt sederhana akan saya jawab langsung. Pekerjaan strategis akan saya proses lebih dalam.'}])
  const [prompt,setPrompt]=useState(''),[loading,setLoading]=useState(false),[route,setRoute]=useState('General')
  const [campaign,setCampaign]=useState({brand:'Kopi Senja',objective:'Grand opening',target:'Gen Z & young professionals',location:'Blok M, Jakarta',budget:'Rp100.000.000',period:'4 minggu',challenge:'Mendorong first visit dan repeat visit'})
  const [result,setResult]=useState('')
  useEffect(()=>persist('markeai-brand',brand),[brand]);useEffect(()=>persist('markeai-projects',projects),[projects])
  const nav=[['home','Home',Home],['chat','Chat AI',MessageSquareText],['campaign','Campaign Builder',Target],['brand','Brand Brain',BrainCircuit],['projects','Projects',FolderKanban],['settings','Settings',Settings]]
  async function ask(text=prompt,kind='chat'){
    const q=(text||'').trim();if(!q||loading)return
    if(kind==='chat'){setMessages(x=>[...x,{role:'user',text:q}]);setPrompt('')}
    setLoading(true)
    try{
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:q,brand,mode})})
      const d=await r.json();setRoute(d.route||'General')
      if(kind==='chat')setMessages(x=>[...x,{role:'assistant',text:d.text,meta:d.route,warning:d.warning}])
      return d.text
    }catch{
      const t='Koneksi bermasalah. Coba lagi.';if(kind==='chat')setMessages(x=>[...x,{role:'assistant',text:t}]);return t
    }finally{setLoading(false)}
  }
  async function buildCampaign(){
    const q='Buat campaign lengkap. Brand: '+campaign.brand+'. Objective: '+campaign.objective+'. Target: '+campaign.target+'. Lokasi: '+campaign.location+'. Budget: '+campaign.budget+'. Periode: '+campaign.period+'. Challenge: '+campaign.challenge+'. Gunakan Diagnosis, Strategy, Tactics, KPI, Timeline, dan Next Actions.'
    setResult('');setResult(await ask(q,'campaign')||'')
  }
  function saveProject(){if(!result)return;setProjects(x=>[{id:Date.now(),title:campaign.objective+' — '+campaign.brand,type:'Campaign Plan',content:result},...x]);setPage('projects')}
  return <div className="app">
    <aside className="sidebar">
      <div className="logo"><div className="logoMark">M</div><div><b>MarkeAI</b><span>AI Marketing Assistant</span></div><em>MVP</em></div>
      <nav>{nav.map(([k,l,I])=><button key={k} className={page===k?'active':''} onClick={()=>setPage(k)}><I size={18}/>{l}</button>)}</nav>
      <div className="workspace"><small>WORKSPACE</small><b>{brand.name}</b><span>{brand.category}</span></div>
    </aside>
    <main>
      <header><div><small>MARKEAI WORKSPACE</small><h1>{page==='home'?'Selamat datang 👋':nav.find(n=>n[0]===page)?.[1]}</h1></div><div className="mode"><Zap size={15}/><select value={mode} onChange={e=>setMode(e.target.value)}><option>Auto</option><option>Fast</option><option>Deep</option></select></div></header>
      {page==='home'&&<><section className="hero"><div><span>AI Marketing Workstation</span><h2>Apa yang ingin kamu kerjakan hari ini?</h2><p>Dari pertanyaan sederhana sampai campaign strategis—MarkeAI memilih alur kerja secara otomatis.</p><button onClick={()=>setPage('chat')}><Sparkles size={17}/>Mulai dengan AI</button></div><BrainCircuit size={90}/></section><section className="quick">{[[Target,'Buat Campaign'],[FileText,'Rencana Konten'],[Search,'Riset Kompetitor'],[TrendingUp,'Tingkatkan Sales'],[PenTool,'Copywriting'],[BrainCircuit,'Strategi Marketing']].map(([I,t])=><button key={t} onClick={()=>setPage(t==='Buat Campaign'?'campaign':'chat')}><I/><b>{t}</b><span>Mulai pekerjaan marketing</span></button>)}</section><div className="two"><section className="card"><h3>Project terbaru</h3>{projects.slice(0,3).map(p=><div className="project" key={p.id}><FileText/><div><b>{p.title}</b><span>{p.type}</span></div></div>)}</section><section className="card"><h3>Brand Brain</h3><b>{brand.name}</b><p>{brand.category}</p><small>Target</small><p>{brand.target}</p><small>Objective</small><p>{brand.objective}</p><small>Budget</small><p>{brand.budget}</p></section></div></>}
      {page==='chat'&&<section className="chat card"><div className="chatHead"><b>Marketing AI</b><span>{route}</span></div><div className="messages">{messages.map((m,i)=><div key={i} className={'msg '+m.role}><b>{m.role==='assistant'?'M':'U'}</b><div><pre>{m.text}</pre>{m.meta&&<small>{m.meta}</small>}{m.warning&&<small className="warn">{m.warning}</small>}</div></div>)}{loading&&<div className="loading"><Loader2 className="spin"/>Memahami kebutuhan...</div>}</div><div className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Tanyakan apa saja tentang marketing..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}}}/><button onClick={()=>ask()}><Send/></button></div><div className="examples"><button onClick={()=>ask('Buat 10 headline promo Lebaran untuk coffee shop saya')}>Headline promo</button><button onClick={()=>ask('Saya mau bikin campaign grand opening coffee shop baru di Blok M dengan budget Rp100 juta')}>Campaign grand opening</button><button onClick={()=>ask('Kenapa campaign saya kemarin tidak bekerja?')}>Analisis campaign</button></div></section>}
      {page==='campaign'&&<div className="campaign"><section className="card"><h2>Campaign Builder</h2><p>Brief → Diagnosis → Strategy → Tactics</p>{Object.entries(campaign).map(([k,v])=><label key={k}><span>{k}</span>{k==='challenge'?<textarea value={v} onChange={e=>setCampaign({...campaign,[k]:e.target.value})}/>:<input value={v} onChange={e=>setCampaign({...campaign,[k]:e.target.value})}/>}</label>)}<button className="primary" onClick={buildCampaign} disabled={loading}>{loading?<Loader2 className="spin"/>:<Sparkles/>}Generate Campaign</button></section><section className="card result"><div className="resultHead"><h3>Campaign Workspace</h3>{result&&<button onClick={saveProject}><Save size={15}/>Simpan</button>}</div>{!result&&!loading&&<div className="empty">Belum ada output.</div>}{loading&&<div className="empty"><Loader2 className="spin"/>Menjalankan DST Workflow...</div>}{result&&<pre>{result}</pre>}</section></div>}
      {page==='brand'&&<section className="card"><h2>Brand Brain</h2><p>Konteks ini dipakai otomatis untuk jawaban yang lebih relevan.</p><div className="brandGrid">{Object.entries(brand).map(([k,v])=><label key={k}><span>{k}</span><textarea value={v} onChange={e=>setBrand({...brand,[k]:e.target.value})}/></label>)}</div><div className="saved"><CheckCircle2 size={16}/>Tersimpan otomatis di browser.</div></section>}
      {page==='projects'&&<section className="card"><h2>Projects</h2><div className="projectGrid">{projects.map(p=><article key={p.id}><FileText/><span>{p.type}</span><h3>{p.title}</h3>{p.content&&<details><summary>Lihat hasil</summary><pre>{p.content}</pre></details>}</article>)}</div></section>}
      {page==='settings'&&<section className="card"><h2>Settings</h2><div className="setting"><div><b>AI Mode</b><span>Auto direkomendasikan.</span></div><select value={mode} onChange={e=>setMode(e.target.value)}><option>Auto</option><option>Fast</option><option>Deep</option></select></div><div className="setting"><div><b>Architecture</b><span>General Assistant + DST Strategic Workflow + Brand Brain</span></div><em>V1</em></div></section>}
    </main>
  </div>
}