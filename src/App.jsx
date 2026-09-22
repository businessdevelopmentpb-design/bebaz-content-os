import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  BarChart3, CalendarDays, Columns3, Download, FileUp, Gauge, LayoutDashboard,
  LogOut, Plus, Search, Sparkles, Users, X, ExternalLink, RefreshCw
} from 'lucide-react'
import { supabase } from './lib/supabase'

const SHARED_EMAIL='businessdevelopmentpb@gmail.com'

const STAGES = [
  ['idea','Idea'],['briefing','Briefing'],['production','Production'],['editing','Editing'],
  ['internal_review','Internal Review'],['revision','Revision'],['approved','Approved'],
  ['scheduled','Scheduled'],['published','Published'],['on_hold','On Hold'],['cancelled','Cancelled']
]
const stageLabel = Object.fromEntries(STAGES)
const WORKFLOW_STAGES = STAGES.filter(([v])=>v!=='cancelled')
const EMPTY_METRICS={views:0,reach:0,likes:0,comments:0,shares:0,saves:0,profile_visits:0,link_clicks:0,voucher_claims:0,transactions:0,revenue:0}
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0))
const num=n=>new Intl.NumberFormat('id-ID').format(Number(n||0))
const pct=n=>`${Number(n||0).toFixed(2)}%`
const rate=(a,b)=>b?Number(a||0)/Number(b)*100:0
const impactScore=r=>Math.min(100,Math.min(rate(r.shares,r.views),10)*4+Math.min(rate(Number(r.likes||0)+Number(r.comments||0)+Number(r.shares||0)+Number(r.saves||0),r.reach),15)*2+Math.min(rate(r.link_clicks,r.reach),10)*2+Math.min(rate(r.transactions,r.link_clicks),20)*0.5)
const csvEscape=v=>`"${String(v??'').replaceAll('"','""')}"`
const prettyBrand=b=>b==='PB'?'PhotoBebaz':b

function AuthScreen({onSession}){
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault(); setBusy(true); setMsg('')
    const {data,error}=await supabase.auth.signInWithPassword({email:SHARED_EMAIL,password})
    if(!error){setBusy(false);onSession(data.session);return}

    const {data:created,error:createError}=await supabase.auth.signUp({
      email:SHARED_EMAIL,
      password,
      options:{data:{full_name:'Bebaz Content Team'}}
    })
    setBusy(false)
    if(created?.session){onSession(created.session);return}
    if(createError?.message?.toLowerCase().includes('already')){
      setMsg('Password salah. Gunakan password shared Content Team.')
      return
    }
    if(createError){setMsg(createError.message);return}
    setMsg('Shared account activated. Check the shared email once to confirm it, then sign in again.')
  }
  return <div className="login-shell"><form className="login-card" onSubmit={submit}>
    <div className="brand-mark">B</div><h1>Bebaz Content OS</h1><p>Satu link bersama untuk planning, workflow, performance & learning Content Team.</p>
    <label>Shared email<input value={SHARED_EMAIL} type="email" readOnly/></label>
    <label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength="6" required autoFocus/></label>
    <button className="primary wide" disabled={busy}>{busy?'Please wait…':'Sign in'}</button>
    {msg&&<div className="auth-message">{msg}</div>}
  </form></div>
}

function App(){
  const [session,setSession]=useState(null)
  const [authReady,setAuthReady]=useState(false)
  const [teamMembers,setTeamMembers]=useState([])
  const [page,setPage]=useState('Dashboard')
  const [rows,setRows]=useState([])
  const [metrics,setMetrics]=useState({})
  const [loading,setLoading]=useState(true)
  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [brandFilter,setBrandFilter]=useState('All')
  const [platformFilter,setPlatformFilter]=useState('All')
  const [picFilter,setPicFilter]=useState('All')
  const [monthFilter,setMonthFilter]=useState('All')
  const [showForm,setShowForm]=useState(false)
  const [metricContent,setMetricContent]=useState(null)
  const [notice,setNotice]=useState('')
  const fileInput=useRef(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthReady(true)})
    return()=>subscription.unsubscribe()
  },[])

  const loadAll=useCallback(async()=>{
    if(!session) return
    setLoading(true)
    const [t,c,m]=await Promise.all([
      supabase.from('team_members').select('*').eq('is_active',true).order('name'),
      supabase.from('contents').select('*').order('publish_date',{ascending:false,nullsFirst:false}),
      supabase.from('content_metrics').select('*').order('measured_at',{ascending:false})
    ])
    if(t.error||c.error||m.error){setNotice(`Load error: ${t.error?.message||c.error?.message||m.error?.message}`);setLoading(false);return}
    setTeamMembers(t.data||[])
    const latest={}
    for(const x of (m.data||[])) if(!latest[x.content_id]) latest[x.content_id]=x
    setMetrics(latest)
    const content=c.data||[]
    setRows(content)
    setLoading(false)
  },[session])

  useEffect(()=>{if(session) loadAll(); else {setRows([]);setTeamMembers([])}},[session,loadAll])
  useEffect(()=>{
    if(!session) return
    const ch=supabase.channel('content-os-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'contents'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'content_metrics'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},()=>loadAll())
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[session,loadAll])

  const canEdit=Boolean(session)
  const memberName=id=>teamMembers.find(p=>p.id===id)?.name||''
  const mergedRows=useMemo(()=>rows.map(r=>({...r,...(metrics[r.id]||EMPTY_METRICS),pic_name:memberName(r.pic_member_id),editor_name:memberName(r.editor_member_id)})),[rows,metrics,teamMembers])
  const options=key=>[...new Set(mergedRows.map(r=>r[key]).filter(Boolean))].sort()
  const filtered=useMemo(()=>mergedRows.filter(r=>{
    const month=r.publish_date?.slice(0,7)||''
    const hay=`${r.content_code} ${r.title} ${r.brand} ${r.content_pillar} ${r.topic} ${r.platform} ${r.post_type} ${r.pic_name}`.toLowerCase()
    return (statusFilter==='All'||r.status===statusFilter) && (brandFilter==='All'||r.brand===brandFilter) &&
      (platformFilter==='All'||r.platform===platformFilter) && (picFilter==='All'||r.pic_member_id===picFilter) &&
      (monthFilter==='All'||month===monthFilter) && (!query||hay.includes(query.toLowerCase()))
  }),[mergedRows,statusFilter,brandFilter,platformFilter,picFilter,monthFilter,query])

  async function saveContent(payload){
    const code=payload.content_code||nextContentCode(payload.brand)
    const {error}=await supabase.from('contents').insert({...payload,content_code:code,created_by:session.user.id})
    if(error) return setNotice(error.message)
    setShowForm(false); setNotice(`Created ${code}`); loadAll()
  }
  function nextContentCode(brand){
    const prefix=(brand||'PB').toLowerCase().includes('land')?'BL':'PB'
    const year=new Date().getFullYear()
    const nums=rows.map(r=>r.content_code).filter(x=>x?.startsWith(`${prefix}-${year}-`)).map(x=>Number(x.split('-').pop())).filter(Number.isFinite)
    return `${prefix}-${year}-${String((Math.max(0,...nums)+1)).padStart(3,'0')}`
  }
  async function moveStage(id,status){
    if(!canEdit) return
    const before=rows; setRows(r=>r.map(x=>x.id===id?{...x,status}:x))
    const {error}=await supabase.from('contents').update({status}).eq('id',id)
    if(error){setRows(before);setNotice(error.message)}
  }
  async function saveMetrics(contentId,data){
    const payload={...data,content_id:contentId,measured_at:new Date().toISOString().slice(0,10),created_by:session.user.id,source:'manual'}
    const {error}=await supabase.from('content_metrics').upsert(payload,{onConflict:'content_id,measured_at'})
    if(error) return setNotice(error.message)
    setMetricContent(null);setNotice('Performance updated.');loadAll()
  }
  function exportCsv(){
    const cols=['content_code','publish_date','status','title','brand','content_pillar','topic','platform','post_type','schedule_status','brief_url','preview_url','publish_url']
    const csv=[cols.join(','),...filtered.map(r=>cols.map(c=>csvEscape(r[c])).join(','))].join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`bebaz-content-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)
  }
  async function importCsv(file){
    if(!file||!canEdit)return
    const text=await file.text();const lines=parseCsv(text);if(lines.length<2)return
    const headers=lines[0].map(x=>x.trim());const items=lines.slice(1).filter(r=>r.some(Boolean)).map(vals=>Object.fromEntries(headers.map((h,i)=>[h,vals[i]||null])))
    const accepted=['content_code','publish_date','status','title','brand','content_pillar','topic','platform','post_type','schedule_status','brief_url','preview_url','publish_url','notes']
    const payload=items.map(item=>Object.fromEntries(accepted.filter(k=>item[k]!=null&&item[k]!=='').map(k=>[k,item[k]]))).filter(x=>x.title).map(x=>({...x,created_by:session.user.id,status:x.status||'idea'}))
    if(!payload.length)return setNotice('CSV has no valid rows.')
    const {error}=await supabase.from('contents').upsert(payload,{onConflict:'content_code'})
    if(error)setNotice(error.message);else{setNotice(`${payload.length} CSV rows imported.`);loadAll()}
    fileInput.current.value=''
  }
  function parseCsv(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}return rows}

  if(!authReady)return <div className="loading-screen">Loading Bebaz Content OS…</div>
  if(!session)return <AuthScreen onSession={setSession}/>

  const published=mergedRows.filter(r=>r.status==='published').length
  const inProduction=mergedRows.filter(r=>['briefing','production','editing','internal_review','revision'].includes(r.status)).length
  const onSchedule=mergedRows.filter(r=>r.schedule_status==='On Schedule').length
  const totalViews=mergedRows.reduce((s,r)=>s+Number(r.views||0),0)
  const revenue=mergedRows.reduce((s,r)=>s+Number(r.revenue||0),0)
  const nav=[['Dashboard',LayoutDashboard],['Content Plan',CalendarDays],['Workflow',Columns3],['Performance',Gauge],['Insights',BarChart3],['PIC List',Users]]

  return <div className="app-shell">
    <aside><div className="logo-wrap"><div className="brand-mark small">B</div><div><strong>Bebaz</strong><span>Content OS</span></div></div>
      <nav>{nav.map(([n,I])=><button key={n} className={page===n?'active':''} onClick={()=>setPage(n)}><I size={18}/>{n}</button>)}</nav>
      <div className="side-bottom"><div className="user-card"><b>Bebaz Content Team</b><span>Shared login</span></div><button className="ghost" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sign out</button></div>
    </aside>
    <main>
      <header><div><div className="eyebrow">CONTENT GROWTH OPERATING SYSTEM</div><h1>{page}</h1><p>Plan better creative, ship faster, learn from performance, connect content to business impact.</p></div><div className="header-actions"><button className="secondary icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={16}/></button>{canEdit&&<button className="primary" onClick={()=>setShowForm(true)}><Plus size={17}/>New Content</button>}</div></header>
      {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {page==='Dashboard'&&<Dashboard rows={mergedRows} published={published} inProduction={inProduction} onSchedule={onSchedule} totalViews={totalViews} revenue={revenue}/>}
      {page==='Content Plan'&&<ContentPlan rows={filtered} loading={loading} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} brandFilter={brandFilter} setBrandFilter={setBrandFilter} platformFilter={platformFilter} setPlatformFilter={setPlatformFilter} picFilter={picFilter} setPicFilter={setPicFilter} monthFilter={monthFilter} setMonthFilter={setMonthFilter} brands={options('brand')} platforms={options('platform')} teamMembers={teamMembers} months={options('publish_date').map(x=>x.slice(0,7)).filter((x,i,a)=>a.indexOf(x)===i).sort().reverse()} canEdit={canEdit} exportCsv={exportCsv} importClick={()=>fileInput.current?.click()}/>}
      {page==='Workflow'&&<Workflow rows={mergedRows} moveStage={moveStage} canEdit={canEdit}/>}
      {page==='Performance'&&<Performance rows={mergedRows} onEdit={setMetricContent} canEdit={canEdit}/>}
      {page==='Insights'&&<Insights rows={mergedRows}/>}
      {page==='PIC List'&&<PicManager teamMembers={teamMembers} onChanged={loadAll} setNotice={setNotice}/>}
      <input ref={fileInput} hidden type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])}/>
    </main>
    {showForm&&<NewContent teamMembers={teamMembers} onClose={()=>setShowForm(false)} onSave={saveContent}/>}
    {metricContent&&<MetricsModal content={metricContent} metrics={metrics[metricContent.id]||EMPTY_METRICS} onClose={()=>setMetricContent(null)} onSave={saveMetrics}/>}
  </div>
}

function Dashboard({rows,published,inProduction,onSchedule,totalViews,revenue}){
  const needsReview=rows.filter(r=>['internal_review','revision'].includes(r.status)).length
  const onTimeRate=rows.length?onSchedule/rows.length*100:0
  const cards=[['Total Planned',rows.length],['Published',published],['In Production',inProduction],['On-time Rate',pct(onTimeRate)],['Total Views',num(totalViews)],['Attributed Revenue',money(revenue)]]
  return <><section className="metrics-grid">{cards.map(([k,v])=><div className="metric" key={k}><span>{k}</span><strong>{v}</strong></div>)}</section>
    <section className="two-col"><div className="panel"><div className="panel-head"><h2>Current pipeline</h2><span>{needsReview} need review</span></div>{WORKFLOW_STAGES.map(([value,label])=>{const c=rows.filter(r=>r.status===value).length;return <div className="summary-line" key={value}><span>{label}</span><div><b>{c}</b><i style={{width:`${Math.min(100,c/Math.max(1,rows.length)*500)}%`}}/></div></div>})}</div>
    <div className="panel"><div className="panel-head"><h2>Head priorities</h2></div><div className="priority"><Sparkles/><div><b>Creative quality before volume</b><p>Challenge hook, storytelling, shareability and CTA before publishing.</p></div></div><div className="priority"><Users/><div><b>Clear ownership</b><p>Every content item should have one accountable PIC, deadline and next action.</p></div></div><div className="priority"><Gauge/><div><b>Close the learning loop</b><p>Published content is not done until performance and learnings are recorded.</p></div></div></div></section></>
}

function ContentPlan(p){
  const {rows,loading,query,setQuery,statusFilter,setStatusFilter,brandFilter,setBrandFilter,platformFilter,setPlatformFilter,picFilter,setPicFilter,monthFilter,setMonthFilter,brands,platforms,teamMembers,canEdit,exportCsv,importClick}=p
  return <section className="panel"><div className="toolbar"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search content, platform, pillar, PIC…"/></div>
    <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}><option>All</option>{p.months.map(x=><option key={x}>{x}</option>)}</select>
    <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}><option>All</option>{brands.map(x=><option key={x}>{x}</option>)}</select>
    <select value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)}><option>All</option>{platforms.map(x=><option key={x}>{x}</option>)}</select>
    <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="All">All status</option>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    <select value={picFilter} onChange={e=>setPicFilter(e.target.value)}><option value="All">All PIC</option>{teamMembers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
    <button className="secondary" onClick={exportCsv}><Download size={16}/>Export</button>{canEdit&&<button className="secondary" onClick={importClick}><FileUp size={16}/>Import CSV</button>}</div>
    <div className="table-wrap"><table><thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Title</th><th>Brand</th><th>Pillar</th><th>Topic</th><th>Platform</th><th>Type</th><th>PIC</th><th>Links</th></tr></thead><tbody>{loading?<tr><td colSpan="11">Loading…</td></tr>:rows.map(r=><tr key={r.id}><td><b>{r.content_code||'-'}</b></td><td>{r.publish_date||'-'}</td><td><span className={`status-pill s-${r.status}`}>{stageLabel[r.status]||r.status}</span></td><td className="title-cell"><b>{r.title}</b><small>{r.schedule_status||''}</small></td><td>{prettyBrand(r.brand)}</td><td>{r.content_pillar||'-'}</td><td>{r.topic||'-'}</td><td>{r.platform||'-'}</td><td>{r.post_type||'-'}</td><td>{r.pic_name||'-'}</td><td><div className="link-cluster">{r.brief_url&&<a href={r.brief_url} target="_blank" rel="noreferrer" title="Brief"><ExternalLink size={14}/></a>}{r.preview_url&&<a href={r.preview_url} target="_blank" rel="noreferrer" title="Preview"><ExternalLink size={14}/></a>}{r.publish_url&&<a href={r.publish_url} target="_blank" rel="noreferrer" title="Published"><ExternalLink size={14}/></a>}</div></td></tr>)}</tbody></table></div>
  </section>
}

function Workflow({rows,moveStage,canEdit}){return <div className="kanban">{WORKFLOW_STAGES.map(([value,label])=><div className="lane" key={value}><div className="lane-head"><b>{label}</b><span>{rows.filter(r=>r.status===value).length}</span></div>{rows.filter(r=>r.status===value).map(r=><article key={r.id}><small>{prettyBrand(r.brand)} · {r.platform||'No platform'}</small><h3>{r.title}</h3><p>{r.pic_name||'No PIC'} · {r.publish_date||'No date'}</p>{canEdit?<select value={r.status} onChange={e=>moveStage(r.id,e.target.value)}>{WORKFLOW_STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<span className="status-pill">{label}</span>}</article>)}</div>)}</div>}

function Performance({rows,onEdit,canEdit}){return <section className="panel"><div className="panel-head"><h2>Published content performance</h2><span>Enter real platform data only</span></div><div className="table-wrap"><table><thead><tr><th>Content</th><th>Views</th><th>Reach</th><th>Shares</th><th>Saves</th><th>ER</th><th>Share Rate</th><th>Clicks</th><th>Transactions</th><th>Revenue</th><th>Impact</th><th></th></tr></thead><tbody>{rows.filter(r=>r.status==='published').map(r=>{const eng=Number(r.likes||0)+Number(r.comments||0)+Number(r.shares||0)+Number(r.saves||0);return <tr key={r.id}><td className="title-cell"><b>{r.title}</b><small>{r.content_code} · {r.platform||'-'}</small></td><td>{num(r.views)}</td><td>{num(r.reach)}</td><td>{num(r.shares)}</td><td>{num(r.saves)}</td><td>{pct(rate(eng,r.reach))}</td><td>{pct(rate(r.shares,r.views))}</td><td>{num(r.link_clicks)}</td><td>{num(r.transactions)}</td><td>{money(r.revenue)}</td><td><b>{impactScore(r).toFixed(1)}</b></td><td>{canEdit&&<button className="mini-btn" onClick={()=>onEdit(r)}>Update</button>}</td></tr>})}</tbody></table></div></section>}

function Insights({rows}){
  const by=key=>Object.entries(rows.reduce((a,r)=>{const k=r[key]||'Unclassified';if(!a[k])a[k]={count:0,views:0,shares:0,revenue:0};a[k].count++;a[k].views+=Number(r.views||0);a[k].shares+=Number(r.shares||0);a[k].revenue+=Number(r.revenue||0);return a},{})).sort((a,b)=>b[1].views-a[1].views||b[1].count-a[1].count)
  const top=[...rows].filter(r=>Number(r.views||0)>0).sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,8)
  return <><div className="three-col">{[['Content Pillar','content_pillar'],['Platform','platform'],['Post Type','post_type']].map(([title,key])=><section className="panel" key={key}><h2>{title}</h2>{by(key).map(([name,v])=><div className="insight-row" key={name}><div><b>{name}</b><small>{v.count} content</small></div><div><b>{num(v.views)} views</b><small>{num(v.shares)} shares · {money(v.revenue)}</small></div></div>)}</section>)}</div>
    <section className="panel top-panel"><div className="panel-head"><h2>Top-performing content</h2><span>{top.length? 'Based on recorded views':'No performance data recorded yet'}</span></div>{top.length?top.map((r,i)=><div className="top-row" key={r.id}><b>#{i+1}</b><div><strong>{r.title}</strong><small>{r.content_code} · {r.platform}</small></div><div><strong>{num(r.views)} views</strong><small>{num(r.shares)} shares · {money(r.revenue)}</small></div></div>):<div className="empty-state">Performance is intentionally blank until the team enters real metrics.</div>}</section></>
}

function PicManager({teamMembers,onChanged,setNotice}){
  const [name,setName]=useState('')
  const [func,setFunc]=useState('Content')
  async function addMember(e){
    e.preventDefault()
    if(!name.trim())return
    const {error}=await supabase.from('team_members').insert({name:name.trim(),function:func.trim()||null})
    if(error)setNotice(error.message);else{setName('');setNotice('PIC added.');onChanged()}
  }
  async function removeMember(id){
    const {error}=await supabase.from('team_members').update({is_active:false}).eq('id',id)
    if(error)setNotice(error.message);else{setNotice('PIC deactivated.');onChanged()}
  }
  return <section className="panel"><div className="panel-head"><div><h2>PIC List</h2><span>Nama PIC di sini bukan akun login. Semua tetap memakai satu shared login.</span></div></div>
    <form className="pic-form" onSubmit={addMember}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama PIC" required/><input value={func} onChange={e=>setFunc(e.target.value)} placeholder="Function / role"/><button className="primary">Add PIC</button></form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Function</th><th>Status</th><th></th></tr></thead><tbody>{teamMembers.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.function||'-'}</td><td><span className="status-pill">Active</span></td><td><button className="mini-btn" onClick={()=>removeMember(p.id)}>Deactivate</button></td></tr>)}</tbody></table></div>
  </section>
}

function NewContent({teamMembers,onClose,onSave}){
  const [f,setF]=useState({content_code:'',title:'',publish_date:'',status:'idea',brand:'PB',content_pillar:'Promotion',topic:'Branding',platform:'Instagram & TikTok',post_type:'Video',pic_member_id:'',brief_url:'',preview_url:'',publish_url:'',objective:'',hook:'',cta:''})
  const set=(k,v)=>setF(x=>({...x,[k]:v||null}))
  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card large" onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="modal-title"><div><h2>New Content</h2><p>Create one accountable content record.</p></div><button type="button" className="close-btn" onClick={onClose}><X/></button></div><div className="form-grid">
    <label className="span2">Title<input required value={f.title} onChange={e=>set('title',e.target.value)}/></label><label>Publish date<input type="date" value={f.publish_date||''} onChange={e=>set('publish_date',e.target.value)}/></label>
    <label>Status<select value={f.status} onChange={e=>set('status',e.target.value)}>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Brand<input value={f.brand||''} onChange={e=>set('brand',e.target.value)}/></label><label>PIC<select value={f.pic_member_id||''} onChange={e=>set('pic_member_id',e.target.value)}><option value="">Unassigned</option>{teamMembers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Content pillar<input value={f.content_pillar||''} onChange={e=>set('content_pillar',e.target.value)}/></label><label>Topic<input value={f.topic||''} onChange={e=>set('topic',e.target.value)}/></label><label>Platform<input value={f.platform||''} onChange={e=>set('platform',e.target.value)}/></label><label>Post type<input value={f.post_type||''} onChange={e=>set('post_type',e.target.value)}/></label>
    <label className="span2">Hook<input value={f.hook||''} onChange={e=>set('hook',e.target.value)}/></label><label>CTA<input value={f.cta||''} onChange={e=>set('cta',e.target.value)}/></label><label className="span3">Brief URL<input value={f.brief_url||''} onChange={e=>set('brief_url',e.target.value)}/></label>
  </div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Create content</button></div></form></div>
}

function MetricsModal({content,metrics,onClose,onSave}){
  const fields=[['views','Views'],['reach','Reach'],['likes','Likes'],['comments','Comments'],['shares','Shares'],['saves','Saves'],['profile_visits','Profile Visits'],['link_clicks','Link Clicks'],['voucher_claims','Voucher Claims'],['transactions','Transactions'],['revenue','Revenue (IDR)']]
  const [f,setF]=useState(Object.fromEntries(fields.map(([k])=>[k,Number(metrics[k]||0)])))
  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card" onSubmit={e=>{e.preventDefault();onSave(content.id,f)}}><div className="modal-title"><div><h2>Update performance</h2><p>{content.content_code} · {content.title}</p></div><button type="button" className="close-btn" onClick={onClose}><X/></button></div><div className="form-grid metrics-form">{fields.map(([k,l])=><label key={k}>{l}<input type="number" min="0" step={k==='revenue'?'1000':'1'} value={f[k]} onChange={e=>setF(x=>({...x,[k]:Number(e.target.value||0)}))}/></label>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save metrics</button></div></form></div>
}

export default App
