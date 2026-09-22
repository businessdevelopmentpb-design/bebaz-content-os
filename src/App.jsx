import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  BarChart3, CalendarDays, Columns3, Download, FileUp, Gauge, LayoutDashboard,
  LogOut, Plus, Search, Sparkles, Users, X, ExternalLink, RefreshCw,
  Link2, Zap, CheckCircle2, AlertCircle, Instagram, Music2, ShieldCheck, PlugZap, Pencil, Trash2
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
const CONTENT_BRANDS=['PhotoBebaz','Bebaz Event','Bebaz Adz','BebazLand']
const CONTENT_PILLARS=['Branding','Promotion','Entertain']
const CONTENT_TOPICS=['Branding','Engagement','Education','Information','Trend']
const CONTENT_PLATFORMS=['Instagram','Tiktok','Instagram & TikTok']
const CONTENT_TYPES=['Feeds','Video','Carousel']
const normalizeBrand=b=>b==='PB'?'PhotoBebaz':b==='Bebaz Land'?'BebazLand':b==='BL & PB'?'PhotoBebaz':(CONTENT_BRANDS.includes(b)?b:'PhotoBebaz')
const normalizePlatform=p=>p==='TikTok'?'Tiktok':(CONTENT_PLATFORMS.includes(p)?p:'Instagram & TikTok')
const normalizeType=t=>t==='Feed'?'Feeds':(CONTENT_TYPES.includes(t)?t:'Video')
const currentMonthKey=()=>{
  const d=new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
const formatMonthKey=key=>{
  if(key==='All')return 'All Months'
  const [y,m]=String(key).split('-').map(Number)
  if(!y||!m)return key
  return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})
}
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
    if(createError?.message?.toLowerCase().includes('already') || (created?.user && Array.isArray(created.user.identities) && created.user.identities.length===0)){
      setMsg('Password salah. Gunakan password shared Content Team.')
      return
    }
    if(createError){setMsg(createError.message);return}
    setMsg('Akun shared sudah dibuat. Cek email bersama satu kali untuk konfirmasi, lalu sign in kembali.')
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
  const [socialMetrics,setSocialMetrics]=useState([])
  const [socialConnections,setSocialConnections]=useState([])
  const [socialConfigured,setSocialConfigured]=useState({instagram:false,tiktok:false})
  const [socialCallback,setSocialCallback]=useState('')
  const [socialLoading,setSocialLoading]=useState(false)
  const [syncingIds,setSyncingIds]=useState({})
  const [loading,setLoading]=useState(true)
  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [brandFilter,setBrandFilter]=useState('All')
  const [platformFilter,setPlatformFilter]=useState('All')
  const [picFilter,setPicFilter]=useState('All')
  const [monthFilter,setMonthFilter]=useState('All')
  const [showForm,setShowForm]=useState(false)
  const [editContent,setEditContent]=useState(null)
  const [metricContent,setMetricContent]=useState(null)
  const [socialContent,setSocialContent]=useState(null)
  const [detailContent,setDetailContent]=useState(null)
  const [notice,setNotice]=useState('')
  const fileInput=useRef(null)
  const autoSyncAttempted=useRef(new Set())

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthReady(true)})
    return()=>subscription.unsubscribe()
  },[])

  const loadAll=useCallback(async()=>{
    if(!session) return
    setLoading(true)
    const [t,c,m,s]=await Promise.all([
      supabase.from('team_members').select('*').eq('is_active',true).order('name'),
      supabase.from('contents').select('*').order('publish_date',{ascending:false,nullsFirst:false}),
      supabase.from('content_metrics').select('*').order('measured_at',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('social_post_metrics').select('*').order('synced_at',{ascending:false,nullsFirst:false})
    ])
    if(t.error||c.error||m.error||s.error){setNotice(`Load error: ${t.error?.message||c.error?.message||m.error?.message||s.error?.message}`);setLoading(false);return}
    setTeamMembers(t.data||[])
    const latest={}
    for(const x of (m.data||[])) if(!latest[x.content_id]) latest[x.content_id]=x
    setMetrics(latest)
    setSocialMetrics(s.data||[])
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
      .on('postgres_changes',{event:'*',schema:'public',table:'social_post_metrics'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},()=>loadAll())
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[session,loadAll])

  const canEdit=Boolean(session)
  const memberName=id=>teamMembers.find(p=>p.id===id)?.name||''
  const socialByContent=useMemo(()=>{
    const out={}
    for(const row of socialMetrics){
      if(!out[row.content_id]) out[row.content_id]={}
      if(!out[row.content_id][row.platform]) out[row.content_id][row.platform]=row
    }
    return out
  },[socialMetrics])
  const mergedRows=useMemo(()=>rows.map(r=>{
    const m=metrics[r.id]||EMPTY_METRICS
    const metricValues=Object.fromEntries(Object.keys(EMPTY_METRICS).map(k=>[k,Number(m[k]||0)]))
    return {
      ...r,
      ...metricValues,
      metric_id:m.id||null,
      measured_at:m.measured_at||null,
      metric_source:m.source||null,
      social_platforms:socialByContent[r.id]||{},
      pic_name:memberName(r.pic_member_id),
      editor_name:memberName(r.editor_member_id)
    }
  }),[rows,metrics,teamMembers,socialByContent])
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

  async function deleteContent(content){
    if(!content?.id)return
    const ok=window.confirm(`Delete "${content.title}" (${content.content_code||'no ID'})?\n\nThis will also delete related comments and performance records. This action cannot be undone.`)
    if(!ok)return
    const {error}=await supabase.from('contents').delete().eq('id',content.id)
    if(error)return setNotice(`Delete error: ${error.message}`)
    if(editContent?.id===content.id)setEditContent(null)
    if(detailContent?.id===content.id)setDetailContent(null)
    setNotice(`Deleted ${content.content_code||content.title}`)
    loadAll()
  }

  async function updateContent(id,payload){
    const clean={...payload}
    delete clean.id
    delete clean.created_at
    delete clean.updated_at
    delete clean.created_by
    delete clean.pic_name
    delete clean.editor_name
    delete clean.social_platforms
    for(const key of Object.keys(EMPTY_METRICS)) delete clean[key]
    const {error}=await supabase.from('contents').update(clean).eq('id',id)
    if(error)return setNotice(error.message)
    setEditContent(null)
    setNotice(`Updated ${payload.content_code||'content'}`)
    loadAll()
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
    const {data:saved,error}=await supabase.from('content_metrics').upsert(payload,{onConflict:'content_id,measured_at'}).select().single()
    if(error) return setNotice(error.message)
    const {error:flagError}=await supabase.from('contents').update({
      performance_manual_override:true,
      performance_sync_status:'manual',
      performance_sync_error:null
    }).eq('id',contentId)
    if(flagError)return setNotice(flagError.message)

    setMetrics(prev=>({...prev,[contentId]:saved||payload}))
    setRows(prev=>prev.map(row=>row.id===contentId?{
      ...row,
      performance_manual_override:true,
      performance_sync_status:'manual',
      performance_sync_error:null
    }:row))
    setMetricContent(null)
    setNotice('Performance updated manually. Auto overwrite paused until you press Sync.')
    await loadAll()
  }

  async function syncSocialPerformance(contentId,{quiet=false}={}){
    setSyncingIds(x=>({...x,[contentId]:true}))
    if(!quiet){
      const {error:resetError}=await supabase.from('contents').update({
        performance_manual_override:false,
        performance_sync_status:'ready',
        performance_sync_error:null
      }).eq('id',contentId)
      if(resetError){
        setSyncingIds(x=>({...x,[contentId]:false}))
        setNotice(`Social sync error: ${resetError.message}`)
        return {ok:false,error:resetError}
      }
    }

    let data=null
    let error=null
    const direct=await supabase.functions.invoke('sync-social-performance',{body:{content_id:contentId}})
    if(!direct.error){
      data=direct.data
    }else{
      const fallback=await supabase.rpc('sync_windsor_content',{p_content_id:contentId})
      data=fallback.data
      error=fallback.error
    }

    setSyncingIds(x=>({...x,[contentId]:false}))
    if(error){
      if(!quiet)setNotice(`Social sync error: ${error.message}`)
      return {ok:false,error}
    }
    if(!quiet){
      if(data?.status==='synced') setNotice('Social performance synced.')
      else if(data?.status==='partial') setNotice('Sebagian link berhasil disinkronkan. Link lainnya masih menunggu data.')
      else if(data?.status==='waiting_link') setNotice('Tambahkan Instagram atau TikTok link terlebih dahulu.')
      else if(data?.status==='waiting_data') setNotice('Link tersimpan, tetapi post belum ditemukan di source saat ini. Sistem akan mencoba lagi pada refresh berikutnya.')
      else if(data?.status==='connection_required') setNotice('Direct API belum terhubung; fallback source juga tidak tersedia.')
      else if(data?.status==='not_published') setNotice('Performance hanya disinkronkan untuk content berstatus Published.')
    }
    await loadAll()
    return {ok:true,data}
  }

  async function saveSocialLinks(contentId,links){
    const clean={
      instagram_url:links.instagram_url?.trim()||null,
      tiktok_url:links.tiktok_url?.trim()||null,
      performance_sync_status:(links.instagram_url?.trim()||links.tiktok_url?.trim())?'ready':'waiting_link',
      performance_sync_error:null
    }
    const {error}=await supabase.from('contents').update(clean).eq('id',contentId)
    if(error)return setNotice(error.message)
    setSocialContent(null)
    setNotice('Social links saved. Syncing performance…')
    await loadAll()
    await syncSocialPerformance(contentId)
  }

  async function syncAllPublished(scopeRows=null){
    const base=Array.isArray(scopeRows)?scopeRows:mergedRows
    const targets=base.filter(r=>r.status==='published'&&(r.instagram_url||r.tiktok_url)&&!r.performance_manual_override)
    if(!targets.length)return setNotice('Belum ada published content pada periode ini yang memiliki Instagram/TikTok link.')
    setNotice(`Syncing ${targets.length} published content…`)
    for(const row of targets) await syncSocialPerformance(row.id,{quiet:true})
    setNotice('Social performance sync selesai.')
    await loadAll()
  }
  async function loadSocialConnections(){
    if(!session)return
    setSocialLoading(true)
    const [direct,fallback]=await Promise.all([
      supabase.functions.invoke('social-oauth',{body:{action:'status'}}),
      supabase.from('social_sync_sources').select('*').eq('source','windsor').maybeSingle()
    ])
    setSocialLoading(false)

    if(fallback.error)return setNotice(`Social connection error: ${fallback.error.message}`)
    const windsor=fallback.data
    const windsorConnected=windsor?.status==='connected'
    const directRows=direct.data?.connections||[]
    const merged=['instagram','tiktok'].map(platform=>{
      const d=directRows.find(x=>x.platform===platform)||{platform,status:'not_connected'}
      return {
        ...d,
        fallback_connected:windsorConnected,
        fallback_account_name:platform==='instagram'?windsor?.instagram_account_name:windsor?.tiktok_account_name,
        fallback_last_synced_at:windsor?.last_synced_at||null,
        fallback_error:windsor?.last_error||null
      }
    })
    setSocialConnections(merged)
    setSocialConfigured(direct.data?.configured||{instagram:false,tiktok:false})
    setSocialCallback(direct.data?.callback_url||'https://ltqgbwomlhuyxxdmghih.supabase.co/functions/v1/social-oauth')
  }

  async function connectSocial(platform){
    if(!socialConfigured?.[platform]){
      setNotice(`${platform==='instagram'?'Instagram':'TikTok'} Direct API belum punya developer credentials. Backend sudah siap; credentials perlu dibuat/di-authorize satu kali di developer portal.`)
      return
    }
    setSocialLoading(true)
    const {data,error}=await supabase.functions.invoke('social-oauth',{body:{action:'start',platform}})
    setSocialLoading(false)
    if(error)return setNotice(`Connect ${platform} error: ${error.message}`)
    if(data?.url)window.location.href=data.url
  }

  async function disconnectSocial(platform){
    if(!window.confirm(`Disconnect Direct API ${platform}? Windsor fallback tidak ikut diputus.`))return
    setSocialLoading(true)
    const {data,error}=await supabase.functions.invoke('social-oauth',{body:{action:'disconnect',platform}})
    setSocialLoading(false)
    if(error)return setNotice(error.message)
    setNotice(`${platform==='instagram'?'Instagram':'TikTok'} Direct API disconnected.`)
    await loadSocialConnections()
  }

  function exportCsv(){
    const cols=['content_code','publish_date','status','title','brand','content_pillar','topic','platform','post_type','schedule_status','copywriting','reference_url','brief_url','preview_url','publish_url','instagram_url','tiktok_url']
    const csv=[cols.join(','),...filtered.map(r=>cols.map(c=>csvEscape(r[c])).join(','))].join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`bebaz-content-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)
  }
  async function importCsv(file){
    if(!file||!canEdit)return
    const text=await file.text();const lines=parseCsv(text);if(lines.length<2)return
    const headers=lines[0].map(x=>x.trim());const items=lines.slice(1).filter(r=>r.some(Boolean)).map(vals=>Object.fromEntries(headers.map((h,i)=>[h,vals[i]||null])))
    const accepted=['content_code','publish_date','status','title','brand','content_pillar','topic','platform','post_type','schedule_status','copywriting','reference_url','brief_url','preview_url','publish_url','instagram_url','tiktok_url','notes']
    const payload=items.map(item=>Object.fromEntries(accepted.filter(k=>item[k]!=null&&item[k]!=='').map(k=>[k,item[k]]))).filter(x=>x.title).map(x=>({...x,created_by:session.user.id,status:x.status||'idea'}))
    if(!payload.length)return setNotice('CSV has no valid rows.')
    const {error}=await supabase.from('contents').upsert(payload,{onConflict:'content_code'})
    if(error)setNotice(error.message);else{setNotice(`${payload.length} CSV rows imported.`);loadAll()}
    fileInput.current.value=''
  }
  function parseCsv(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}return rows}

  useEffect(()=>{
    if(page!=='Performance'||!session||loading)return
    const candidates=mergedRows.filter(r=>r.status==='published'&&(r.instagram_url||r.tiktok_url)&&r.auto_sync_performance!==false&&!r.performance_manual_override)
    for(const row of candidates){
      if(autoSyncAttempted.current.has(row.id))continue
      autoSyncAttempted.current.add(row.id)
      syncSocialPerformance(row.id,{quiet:true})
    }
  },[page,session,loading,mergedRows])

  useEffect(()=>{
    if(page==='Social Connections'&&session)loadSocialConnections()
  },[page,session])

  useEffect(()=>{
    if(!session)return
    const params=new URLSearchParams(window.location.search)
    const connected=params.get('social_connected')
    const socialError=params.get('social_error')
    if(connected||socialError){
      setPage('Social Connections')
      if(connected)setNotice(`${connected==='instagram'?'Instagram':'TikTok'} connected successfully.`)
      if(socialError)setNotice(`Social connection failed: ${socialError}`)
      window.history.replaceState({},'',window.location.pathname)
    }
  },[session])

  if(!authReady)return <div className="loading-screen">Loading Bebaz Content OS…</div>
  if(!session)return <AuthScreen onSession={setSession}/>

  const published=mergedRows.filter(r=>r.status==='published').length
  const inProduction=mergedRows.filter(r=>['briefing','production','editing','internal_review','revision'].includes(r.status)).length
  const onSchedule=mergedRows.filter(r=>r.schedule_status==='On Schedule').length
  const totalViews=mergedRows.reduce((s,r)=>s+Number(r.views||0),0)
  const revenue=mergedRows.reduce((s,r)=>s+Number(r.revenue||0),0)
  const nav=[['Dashboard',LayoutDashboard],['Content Plan',CalendarDays],['Workflow',Columns3],['Performance',Gauge],['Insights',BarChart3],['Social Connections',PlugZap],['PIC List',Users]]

  return <div className="app-shell">
    <aside><div className="logo-wrap"><div className="brand-mark small">B</div><div><strong>Bebaz</strong><span>Content OS</span></div></div>
      <nav>{nav.map(([n,I])=><button key={n} className={page===n?'active':''} onClick={()=>setPage(n)}><I size={18}/>{n}</button>)}</nav>
      <div className="side-bottom"><div className="user-card"><b>Bebaz Content Team</b><span>Shared login</span></div><button className="ghost" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sign out</button></div>
    </aside>
    <main>
      <header><div><div className="eyebrow">CONTENT GROWTH OPERATING SYSTEM</div><h1>{page}</h1><p>Plan better creative, ship faster, learn from performance, connect content to business impact.</p></div><div className="header-actions"><button className="secondary icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={16}/></button>{canEdit&&<button className="primary" onClick={()=>setShowForm(true)}><Plus size={17}/>New Content</button>}</div></header>
      {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {page==='Dashboard'&&<Dashboard rows={mergedRows} published={published} inProduction={inProduction} onSchedule={onSchedule} totalViews={totalViews} revenue={revenue} onOpenDetail={setDetailContent}/>}
      {page==='Content Plan'&&<ContentPlan rows={filtered} loading={loading} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} brandFilter={brandFilter} setBrandFilter={setBrandFilter} platformFilter={platformFilter} setPlatformFilter={setPlatformFilter} picFilter={picFilter} setPicFilter={setPicFilter} monthFilter={monthFilter} setMonthFilter={setMonthFilter} brands={options('brand')} platforms={options('platform')} teamMembers={teamMembers} months={options('publish_date').map(x=>x.slice(0,7)).filter((x,i,a)=>a.indexOf(x)===i).sort().reverse()} canEdit={canEdit} onEdit={setEditContent} onDelete={deleteContent} exportCsv={exportCsv} importClick={()=>fileInput.current?.click()}/>}
      {page==='Workflow'&&<Workflow rows={mergedRows} moveStage={moveStage} canEdit={canEdit}/>}
      {page==='Performance'&&<Performance rows={mergedRows} onEdit={setMetricContent} onEditLinks={setSocialContent} onSync={syncSocialPerformance} onSyncAll={syncAllPublished} syncingIds={syncingIds} canEdit={canEdit}/>}
      {page==='Insights'&&<Insights rows={mergedRows}/>}
      {page==='Social Connections'&&<SocialConnections connections={socialConnections} configured={socialConfigured} callbackUrl={socialCallback} loading={socialLoading} onConnect={connectSocial} onDisconnect={disconnectSocial} onRefresh={loadSocialConnections}/>}
      {page==='PIC List'&&<PicManager teamMembers={teamMembers} onChanged={loadAll} setNotice={setNotice}/>}
      <input ref={fileInput} hidden type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])}/>
    </main>
    {showForm&&<ContentForm teamMembers={teamMembers} onClose={()=>setShowForm(false)} onSave={saveContent}/>}
    {editContent&&<ContentForm content={editContent} teamMembers={teamMembers} onClose={()=>setEditContent(null)} onSave={payload=>updateContent(editContent.id,payload)}/>}
    {metricContent&&<MetricsModal content={metricContent} metrics={metricContent} onClose={()=>setMetricContent(null)} onSave={saveMetrics}/>} 
    {socialContent&&<SocialLinksModal content={socialContent} onClose={()=>setSocialContent(null)} onSave={saveSocialLinks}/>}
    {detailContent&&<ContentDetail content={detailContent} onClose={()=>setDetailContent(null)} onOpenPlan={()=>{
      setQuery(detailContent.content_code||detailContent.title||'')
      setStatusFilter('All');setBrandFilter('All');setPlatformFilter('All');setPicFilter('All');setMonthFilter('All')
      setPage('Content Plan')
      setDetailContent(null)
    }}/>}
  </div>
}

function Dashboard({rows,published,inProduction,onSchedule,totalViews,revenue,onOpenDetail}){
  const today=new Date()
  const [calendarCursor,setCalendarCursor]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1))
  const monthKey=`${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth()+1).padStart(2,'0')}`
  const pipelineMonthName=calendarCursor.toLocaleDateString('en-US',{month:'long',year:'numeric'})
  const monthRows=rows.filter(r=>r.publish_date?.slice(0,7)===monthKey)
  const needsReview=monthRows.filter(r=>['internal_review','revision'].includes(r.status)).length
  const onTimeRate=rows.length?onSchedule/rows.length*100:0
  const cards=[['Total Planned',rows.length],['Published',published],['In Production',inProduction],['On-time Rate',pct(onTimeRate)],['Total Views',num(totalViews)],['Attributed Revenue',money(revenue)]]
  return <><section className="metrics-grid">{cards.map(([k,v])=><div className="metric" key={k}><span>{k}</span><strong>{v}</strong></div>)}</section>
    <ContentCalendar rows={rows} onOpenDetail={onOpenDetail} cursor={calendarCursor} setCursor={setCalendarCursor}/>
    <section className="two-col"><div className="panel"><div className="panel-head"><div><h2>Current pipeline</h2><small className="pipeline-month">{pipelineMonthName} · {monthRows.length} content</small></div><span>{needsReview} need review</span></div>{WORKFLOW_STAGES.map(([value,label])=>{const count=monthRows.filter(r=>r.status===value).length;return <div className="summary-line" key={value}><span>{label}</span><div><b>{count}</b><i style={{width:`${Math.min(100,count/Math.max(1,monthRows.length)*500)}%`}}/></div></div>})}</div>
    <div className="panel"><div className="panel-head"><h2>Head priorities</h2></div><div className="priority"><Sparkles/><div><b>Creative quality before volume</b><p>Challenge hook, storytelling, shareability and CTA before publishing.</p></div></div><div className="priority"><Users/><div><b>Clear ownership</b><p>Every content item should have one accountable PIC, deadline and next action.</p></div></div><div className="priority"><Gauge/><div><b>Close the learning loop</b><p>Published content is not done until performance and learnings are recorded.</p></div></div></div></section></>
}

function ContentCalendar({rows,onOpenDetail,cursor,setCursor}){
  const today=new Date()
  const year=cursor.getFullYear()
  const month=cursor.getMonth()
  const monthKey=`${year}-${String(month+1).padStart(2,'0')}`
  const monthName=cursor.toLocaleDateString('en-US',{month:'long',year:'numeric'})
  const monthRows=rows
    .filter(r=>r.publish_date?.slice(0,7)===monthKey)
    .sort((a,b)=>(a.publish_date||'').localeCompare(b.publish_date||'')||(a.title||'').localeCompare(b.title||''))
  const grouped=monthRows.reduce((acc,row)=>{
    if(!acc[row.publish_date]) acc[row.publish_date]=[]
    acc[row.publish_date].push(row)
    return acc
  },{})
  const daysInMonth=new Date(year,month+1,0).getDate()
  const mondayOffset=(new Date(year,month,1).getDay()+6)%7
  const cells=[...Array(mondayOffset).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while(cells.length%7) cells.push(null)
  const goMonth=delta=>setCursor(new Date(year,month+delta,1))
  const goToday=()=>setCursor(new Date(today.getFullYear(),today.getMonth(),1))
  const publishedThisMonth=monthRows.filter(r=>r.status==='published').length
  const scheduledThisMonth=monthRows.filter(r=>r.status==='scheduled').length

  return <section className="panel calendar-panel">
    <div className="calendar-head">
      <div>
        <div className="eyebrow">CONTENT CALENDAR</div>
        <h2>{monthName}</h2>
        <p>{monthRows.length} content planned · {publishedThisMonth} published · {scheduledThisMonth} scheduled</p>
      </div>
      <div className="calendar-controls">
        <button className="secondary calendar-nav" onClick={()=>goMonth(-1)} aria-label="Previous month">‹</button>
        <button className="secondary" onClick={goToday}>Today</button>
        <button className="secondary calendar-nav" onClick={()=>goMonth(1)} aria-label="Next month">›</button>
      </div>
    </div>
    <div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d}>{d}</div>)}</div>
    <div className="calendar-grid">{cells.map((day,index)=>{
      if(!day) return <div className="calendar-cell empty" key={`empty-${index}`}/>
      const dateKey=`${monthKey}-${String(day).padStart(2,'0')}`
      const items=grouped[dateKey]||[]
      const isToday=dateKey===`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      return <div className={`calendar-cell${isToday?' today':''}`} key={dateKey}>
        <div className="calendar-date"><span>{day}</span>{items.length>0&&<em>{items.length}</em>}</div>
        <div className="calendar-items">
          {items.slice(0,3).map(item=><button type="button" className={`calendar-item cal-${item.status}`} key={item.id} title={`Open detail: ${item.title}`} onClick={()=>onOpenDetail?.(item)}>
            <span className="calendar-dot"/>
            <div><b>{item.title}</b><small>{item.platform||'-'}{item.pic_name?` · ${item.pic_name}`:''}</small></div>
          </button>)}
          {items.length>3&&<div className="calendar-more">+{items.length-3} more content</div>}
        </div>
      </div>
    })}</div>
    <div className="calendar-legend">
      <span><i className="legend-dot published"/>Published</span>
      <span><i className="legend-dot scheduled"/>Scheduled</span>
      <span><i className="legend-dot editing"/>Editing / Production</span>
      <span><i className="legend-dot review"/>Review / Revision</span>
      <span><i className="legend-dot other"/>Other</span>
    </div>
  </section>
}

function ContentPlan(p){
  const {rows,loading,query,setQuery,statusFilter,setStatusFilter,brandFilter,setBrandFilter,platformFilter,setPlatformFilter,picFilter,setPicFilter,monthFilter,setMonthFilter,brands,platforms,teamMembers,canEdit,onEdit,onDelete,exportCsv,importClick}=p
  return <section className="panel"><div className="toolbar">
    <div className="filter-field search-filter"><span>Search</span><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search content, platform, pillar, PIC…"/></div></div>
    <label className="filter-field"><span>Month</span><select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}><option>All</option>{p.months.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Brand</span><select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}><option>All</option>{brands.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Platform</span><select value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)}><option>All</option>{platforms.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="All">All status</option>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label className="filter-field"><span>PIC</span><select value={picFilter} onChange={e=>setPicFilter(e.target.value)}><option value="All">All PIC</option>{teamMembers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <button className="secondary toolbar-action" onClick={exportCsv}><Download size={16}/>Export</button>{canEdit&&<button className="secondary toolbar-action" onClick={importClick}><FileUp size={16}/>Import CSV</button>}</div>
    <div className="table-wrap"><table><thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Title</th><th>Brand</th><th>Pillar</th><th>Topic</th><th>Platform</th><th>Type</th><th>PIC</th><th>Links</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan="12">Loading…</td></tr>:rows.map(r=><tr key={r.id}><td><b>{r.content_code||'-'}</b></td><td>{r.publish_date||'-'}</td><td><span className={`status-pill s-${r.status}`}>{stageLabel[r.status]||r.status}</span></td><td className="title-cell"><b>{r.title}</b><small>{r.schedule_status||''}</small></td><td>{prettyBrand(r.brand)}</td><td>{r.content_pillar||'-'}</td><td>{r.topic||'-'}</td><td>{r.platform||'-'}</td><td>{r.post_type||'-'}</td><td>{r.pic_name||'-'}</td><td><div className="link-cluster">{r.reference_url&&<a href={r.reference_url} target="_blank" rel="noreferrer" title="Reference"><ExternalLink size={14}/></a>}{r.brief_url&&<a href={r.brief_url} target="_blank" rel="noreferrer" title="Brief"><ExternalLink size={14}/></a>}{r.preview_url&&<a href={r.preview_url} target="_blank" rel="noreferrer" title="Preview"><ExternalLink size={14}/></a>}{r.publish_url&&<a href={r.publish_url} target="_blank" rel="noreferrer" title="Published"><ExternalLink size={14}/></a>}</div></td><td>{canEdit&&<div className="row-actions"><button className="mini-btn edit-content-btn" onClick={()=>onEdit(r)}><Pencil size={13}/>Edit</button><button className="mini-btn delete-content-btn" onClick={()=>onDelete(r)}><Trash2 size={13}/>Delete</button></div>}</td></tr>)}</tbody></table></div>
  </section>
}

function MonthPeriodBar({rows,value,onChange,label='Period'}){
  const months=[...new Set(rows.map(r=>r.publish_date?.slice(0,7)).filter(Boolean))]
    .sort((a,b)=>b.localeCompare(a))
  if(!months.includes(currentMonthKey()))months.unshift(currentMonthKey())
  return <div className="period-bar">
    <div><small>{label}</small><b>{formatMonthKey(value)}</b></div>
    <select value={value} onChange={e=>onChange(e.target.value)}>
      <option value="All">All Months</option>
      {months.map(m=><option key={m} value={m}>{formatMonthKey(m)}</option>)}
    </select>
  </div>
}

function Workflow({rows,moveStage,canEdit}){
  const [month,setMonth]=useState(currentMonthKey)
  const monthRows=month==='All'?rows:rows.filter(r=>r.publish_date?.slice(0,7)===month)
  return <>
    <MonthPeriodBar rows={rows} value={month} onChange={setMonth} label="Workflow period"/>
    <div className="kanban">{WORKFLOW_STAGES.map(([value,label])=><div className="lane" key={value}><div className="lane-head"><b>{label}</b><span>{monthRows.filter(r=>r.status===value).length}</span></div>{monthRows.filter(r=>r.status===value).map(r=><article key={r.id}><small>{prettyBrand(r.brand)} · {r.platform||'No platform'}</small><h3>{r.title}</h3><p>{r.pic_name||'No PIC'} · {r.publish_date||'No date'}</p>{canEdit?<select value={r.status} onChange={e=>moveStage(r.id,e.target.value)}>{WORKFLOW_STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<span className="status-pill">{label}</span>}</article>)}</div>)}</div>
  </>
}


function Performance({rows,onEdit,onEditLinks,onSync,onSyncAll,syncingIds,canEdit}){
  const [month,setMonth]=useState(currentMonthKey)
  const monthRows=month==='All'?rows:rows.filter(r=>r.publish_date?.slice(0,7)===month)
  const published=monthRows.filter(r=>r.status==='published')
  const linked=published.filter(r=>r.instagram_url||r.tiktok_url).length
  const synced=published.filter(r=>['synced','partial'].includes(r.performance_sync_status)).length
  const statusLabel=s=>({
    synced:'Synced',partial:'Partial',syncing:'Syncing',connection_required:'Source Offline',
    waiting_data:'Waiting Source',manual:'Manual',error:'Sync Error',ready:'Ready',waiting_link:'Waiting Link',not_published:'Not Published'
  }[s]||'Waiting Link')

  return <>
    <MonthPeriodBar rows={rows} value={month} onChange={setMonth} label="Performance period"/>
    <section className="panel performance-panel">
      <div className="performance-hero">
        <div>
          <div className="eyebrow">AUTO PERFORMANCE TRACKER</div>
          <h2>Published content · {formatMonthKey(month)}</h2>
          <p>Paste Instagram and/or TikTok post links. Content OS matches the URL against the connected Windsor.ai feed and fills performance automatically.</p>
        </div>
        <button className="secondary" onClick={()=>onSyncAll(published)}><Zap size={16}/>Sync This Period</button>
      </div>
      <div className="performance-summary">
        <div><small>Published</small><b>{published.length}</b></div>
        <div><small>With Social Link</small><b>{linked}</b></div>
        <div><small>Auto Synced</small><b>{synced}</b></div>
        <div><small>Waiting Link</small><b>{published.length-linked}</b></div>
      </div>
      <div className="social-api-note windsor-ready"><CheckCircle2 size={16}/><div><b>Windsor.ai connected</b><span>Instagram Insights dan TikTok Organic photobebaz.id sudah menjadi source utama. Views, reach, likes, comments, shares, saves/favorites, dan profile activity akan diperbarui dari feed Windsor.</span></div></div>
      <div className="table-wrap"><table><thead><tr>
        <th>Content</th><th>Instagram</th><th>TikTok</th><th>Sync</th>
        <th>Views</th><th>Reach</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Saves</th>
        <th>ER</th><th>Actions</th>
      </tr></thead><tbody>{published.map(r=>{
        const eng=Number(r.likes||0)+Number(r.comments||0)+Number(r.shares||0)+Number(r.saves||0)
        const ig=r.social_platforms?.instagram
        const tt=r.social_platforms?.tiktok
        return <tr key={r.id}>
          <td className="title-cell"><b>{r.title}</b><small>{r.content_code} · {r.platform||'-'} · {r.publish_date||'-'}</small></td>
          <td><SocialPlatformCell platform="IG" url={r.instagram_url} metric={ig}/></td>
          <td><SocialPlatformCell platform="TT" url={r.tiktok_url} metric={tt}/></td>
          <td><div className={`sync-status sync-${r.performance_sync_status||'waiting_link'}`}>
            {['synced','partial'].includes(r.performance_sync_status)?<CheckCircle2 size={13}/>:<AlertCircle size={13}/>}
            <div><b>{statusLabel(r.performance_sync_status)}</b><small>{r.performance_sync_error|| (r.last_performance_sync_at?new Date(r.last_performance_sync_at).toLocaleString('id-ID'):'Never synced')}</small></div>
          </div></td>
          <td>{num(r.views)}</td><td>{num(r.reach)}</td><td>{num(r.likes)}</td><td>{num(r.comments)}</td><td>{num(r.shares)}</td><td>{num(r.saves)}</td>
          <td>{pct(rate(eng,r.reach||r.views))}</td>
          <td><div className="performance-actions">
            {canEdit&&<button className="mini-btn" onClick={()=>onEditLinks(r)}><Link2 size={13}/>Links</button>}
            {canEdit&&(r.instagram_url||r.tiktok_url)&&<button className="mini-btn" disabled={syncingIds[r.id]} onClick={()=>onSync(r.id)}><RefreshCw size={13} className={syncingIds[r.id]?'spin':''}/>{syncingIds[r.id]?'Syncing':'Sync'}</button>}
            {canEdit&&<button className="mini-btn" onClick={()=>onEdit(r)}><Pencil size={13}/>Edit</button>}
          </div></td>
        </tr>
      })}</tbody></table></div>
    </section>
  </>
}


function SocialPlatformCell({platform,url,metric}){
  if(!url)return <span className="social-empty">No link</span>
  return <div className="social-platform-cell">
    <a href={url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>{platform}</a>
    {metric?.synced_at?<small>{num(metric.views)} views</small>:<small>Waiting sync</small>}
  </div>
}

function Insights({rows}){
  const [month,setMonth]=useState(currentMonthKey)
  const monthRows=month==='All'?rows:rows.filter(r=>r.publish_date?.slice(0,7)===month)
  const by=key=>Object.entries(monthRows.reduce((a,r)=>{const k=r[key]||'Unclassified';if(!a[k])a[k]={count:0,views:0,shares:0,revenue:0};a[k].count++;a[k].views+=Number(r.views||0);a[k].shares+=Number(r.shares||0);a[k].revenue+=Number(r.revenue||0);return a},{})).sort((a,b)=>b[1].views-a[1].views||b[1].count-a[1].count)
  const top=[...monthRows].filter(r=>Number(r.views||0)>0).sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,8)
  return <>
    <MonthPeriodBar rows={rows} value={month} onChange={setMonth} label="Insights period"/>
    <div className="insights-period-summary"><b>{formatMonthKey(month)}</b><span>{monthRows.length} content analyzed</span></div>
    <div className="three-col">{[['Content Pillar','content_pillar'],['Platform','platform'],['Post Type','post_type']].map(([title,key])=><section className="panel" key={key}><h2>{title}</h2>{by(key).map(([name,v])=><div className="insight-row" key={name}><div><b>{name}</b><small>{v.count} content</small></div><div><b>{num(v.views)} views</b><small>{num(v.shares)} shares · {money(v.revenue)}</small></div></div>)}</section>)}</div>
    <section className="panel top-panel"><div className="panel-head"><div><h2>Top-performing content</h2><small className="pipeline-month">{formatMonthKey(month)}</small></div><span>{top.length? 'Based on recorded views':'No performance data recorded yet'}</span></div>{top.length?top.map((r,i)=><div className="top-row" key={r.id}><b>#{i+1}</b><div><strong>{r.title}</strong><small>{r.content_code} · {r.platform} · {r.publish_date||'-'}</small></div><div><strong>{num(r.views)} views</strong><small>{num(r.shares)} shares · {money(r.revenue)}</small></div></div>):<div className="empty-state">No performance data recorded for {formatMonthKey(month)}.</div>}</section>
  </>
}


function SocialConnections({connections,configured,callbackUrl,loading,onConnect,onDisconnect,onRefresh}){
  const getConnection=platform=>connections.find(x=>x.platform===platform)||{platform,status:'not_connected'}
  const cards=[
    {platform:'instagram',name:'Instagram',Icon:Instagram,description:'Official Instagram Direct API for internal performance reporting.'},
    {platform:'tiktok',name:'TikTok',Icon:Music2,description:'Official TikTok Display API for internal performance reporting.'}
  ]
  const formatDate=value=>value?new Date(value).toLocaleString('id-ID'):'—'
  return <div className="social-connections-page">
    <section className="social-connect-hero">
      <div><div className="eyebrow">ZERO-SUBSCRIPTION SOCIAL REPORTING</div><h2>Direct API first, fallback second</h2><p>Target permanen adalah API resmi Instagram/TikTok. Windsor hanya bridge sementara sampai Direct API selesai di-authorize satu kali.</p></div>
      <button className="secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/>Refresh Status</button>
    </section>
    <div className="social-connection-grid">{cards.map(({platform,name,Icon,description})=>{
      const conn=getConnection(platform)
      const directConnected=conn.status==='connected'
      const isConfigured=Boolean(configured?.[platform])
      return <section className={`social-connection-card ${directConnected?'connected':''}`} key={platform}>
        <div className="social-card-head">
          <div className={`social-logo social-${platform}`}><Icon size={24}/></div>
          <div><h3>{name}</h3><span className={`connection-pill connection-${directConnected?'connected':'not_connected'}`}>{directConnected?'Direct API Connected':isConfigured?'Ready to Authorize':'Developer App Required'}</span></div>
        </div>
        <p>{description}</p>
        <div className="connection-details">
          <div><small>Direct API account</small><b>{conn.account_name||'Not connected'}</b></div>
          <div><small>Direct API token</small><b>{directConnected?`Valid until ${formatDate(conn.token_expires_at)}`:'—'}</b></div>
          <div><small>Windsor fallback</small><b>{conn.fallback_connected?`${conn.fallback_account_name||'photobebaz.id'} · Connected`:'Unavailable'}</b></div>
          <div><small>Fallback refreshed</small><b>{formatDate(conn.fallback_last_synced_at)}</b></div>
        </div>
        <div className="scope-box"><ShieldCheck size={15}/><div><small>Permanent free target</small><b>{platform==='instagram'?'Instagram Professional API + Insights':'TikTok Display API · user.info.basic + video.list'}</b></div></div>
        <div className="connection-actions">
          {directConnected?<><button className="secondary" onClick={()=>onConnect(platform)} disabled={!isConfigured||loading}>Reconnect</button><button className="danger-btn" onClick={()=>onDisconnect(platform)} disabled={loading}>Disconnect Direct API</button></>:
          <button className="primary" onClick={()=>onConnect(platform)} disabled={!isConfigured||loading}>{isConfigured?<><PlugZap size={16}/>Authorize Direct API</>:<>Developer Credentials Needed</>}</button>}
        </div>
      </section>
    })}</div>
    <section className="panel connection-setup">
      <div className="panel-head"><div><h2>One-time authorization only</h2><span>Sesudah ini, token refresh ditangani backend secara otomatis.</span></div></div>
      <div className="setup-flow">
        <div><b>1</b><p><strong>Instagram Developer App</strong><span>Client ID + Client Secret disimpan hanya di Supabase Edge Function secrets.</span></p></div>
        <div><b>2</b><p><strong>TikTok Developer App</strong><span>Client Key + Client Secret disimpan hanya di backend.</span></p></div>
        <div><b>3</b><p><strong>OAuth callback</strong><code>{callbackUrl||'https://ltqgbwomlhuyxxdmghih.supabase.co/functions/v1/social-oauth'}</code></p></div>
        <div><b>4</b><p><strong>Auto refresh</strong><span>Instagram long-lived token dan TikTok refresh token diperbarui oleh backend sebelum expiry.</span></p></div>
      </div>
      <div className="security-note"><ShieldCheck size={17}/><p><b>No paid middleware required.</b> Setelah dua Direct API connected, Windsor dapat dilepas tanpa mengubah Content Plan, Performance, atau Insights.</p></div>
    </section>
  </div>
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

function ContentForm({content=null,teamMembers,onClose,onSave}){
  const editing=Boolean(content)
  const initial={
    content_code:content?.content_code||'',
    title:content?.title||'',
    publish_date:content?.publish_date||'',
    status:content?.status||'idea',
    brand:normalizeBrand(content?.brand),
    content_pillar:CONTENT_PILLARS.includes(content?.content_pillar)?content.content_pillar:'Branding',
    topic:CONTENT_TOPICS.includes(content?.topic)?content.topic:'Branding',
    platform:normalizePlatform(content?.platform),
    post_type:normalizeType(content?.post_type),
    pic_member_id:content?.pic_member_id||'',
    copywriting:content?.copywriting||'',
    reference_url:content?.reference_url||'',
    brief_url:content?.brief_url||'',
    preview_url:content?.preview_url||'',
    publish_url:content?.publish_url||'',
    objective:content?.objective||'',
    hook:content?.hook||'',
    cta:content?.cta||'',
    notes:content?.notes||''
  }
  const [f,setF]=useState(initial)
  const set=(k,v)=>setF(x=>({...x,[k]:v===''?null:v}))
  const select=(label,key,values)=><label>{label}<select value={f[key]||''} onChange={e=>set(key,e.target.value)}>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <form className="modal-card large content-form-modal" onSubmit={e=>{e.preventDefault();onSave(f)}}>
      <div className="modal-title"><div><div className="eyebrow">{editing?'REVISE CONTENT':'NEW CONTENT'}</div><h2>{editing?'Edit Content':'New Content'}</h2><p>{editing?`${content.content_code} · Update planning tanpa membuat record baru.`:'Create one accountable content record.'}</p></div><button type="button" className="close-btn" onClick={onClose}><X/></button></div>
      <div className="form-grid">
        <label className="span2">Title<input required value={f.title||''} onChange={e=>set('title',e.target.value)}/></label>
        <label>Posting deadline<input type="date" value={f.publish_date||''} onChange={e=>set('publish_date',e.target.value)}/><small className="field-help">Automatically appears in Dashboard Calendar</small></label>
        <label>Status<select value={f.status||'idea'} onChange={e=>set('status',e.target.value)}>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        {select('Brand','brand',CONTENT_BRANDS)}
        <label>PIC<select value={f.pic_member_id||''} onChange={e=>set('pic_member_id',e.target.value)}><option value="">Unassigned</option>{teamMembers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {select('Pillar','content_pillar',CONTENT_PILLARS)}
        {select('Topic','topic',CONTENT_TOPICS)}
        {select('Platform','platform',CONTENT_PLATFORMS)}
        {select('Type','post_type',CONTENT_TYPES)}
        <label className="span3">Copywriting<textarea rows="5" value={f.copywriting||''} onChange={e=>set('copywriting',e.target.value)} placeholder="Tulis caption / copywriting content di sini…"/></label>
        <label className="span3">Reference URL<input type="url" value={f.reference_url||''} onChange={e=>set('reference_url',e.target.value)} placeholder="https://..."/></label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{editing?'Save Revision':'Create Content'}</button></div>
    </form>
  </div>
}

function ContentDetail({content,onClose,onOpenPlan}){
  const metricsFilled=['views','reach','likes','comments','shares','saves','profile_visits','link_clicks','transactions','revenue'].some(k=>Number(content[k]||0)>0)
  const eng=Number(content.likes||0)+Number(content.comments||0)+Number(content.shares||0)+Number(content.saves||0)
  const detailRows=[
    ['Content ID',content.content_code||'-'],
    ['Posting date',content.publish_date||'-'],
    ['Status',stageLabel[content.status]||content.status||'-'],
    ['Brand',prettyBrand(content.brand)||'-'],
    ['Content pillar',content.content_pillar||'-'],
    ['Topic',content.topic||'-'],
    ['Platform',content.platform||'-'],
    ['Post type',content.post_type||'-'],
    ['PIC',content.pic_name||'Unassigned'],
    ['Editor',content.editor_name||'Unassigned'],
    ['Schedule',content.schedule_status||'-']
  ]
  return <div className="modal detail-modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal-card detail-card">
      <div className="detail-hero">
        <div>
          <div className="eyebrow">CONTENT DETAIL</div>
          <h2>{content.title}</h2>
          <div className="detail-tags">
            <span className={`status-pill s-${content.status}`}>{stageLabel[content.status]||content.status}</span>
            <span>{content.content_code||'No ID'}</span>
            <span>{content.publish_date||'No posting date'}</span>
          </div>
        </div>
        <button type="button" className="close-btn detail-close" onClick={onClose}><X/></button>
      </div>

      <div className="detail-layout">
        <section className="detail-section">
          <h3>Content information</h3>
          <div className="detail-grid">{detailRows.map(([label,value])=><div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
        </section>

        <section className="detail-section">
          <h3>Creative direction</h3>
          <div className="detail-copy"><small>Copywriting</small><p>{content.copywriting||'—'}</p></div>
          <div className="detail-copy"><small>Objective</small><p>{content.objective||'—'}</p></div>
          <div className="detail-copy"><small>Hook</small><p>{content.hook||'—'}</p></div>
          <div className="detail-copy"><small>CTA</small><p>{content.cta||'—'}</p></div>
          <div className="detail-copy"><small>Notes</small><p>{content.notes||'—'}</p></div>
        </section>
      </div>

      <section className="detail-section">
        <div className="panel-head"><h3>Links</h3></div>
        <div className="detail-links">
          {content.reference_url?<a href={content.reference_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Reference</a>:<span>Reference —</span>}
          {content.brief_url?<a href={content.brief_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Brief</a>:<span>Brief —</span>}
          {content.preview_url?<a href={content.preview_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Preview</a>:<span>Preview —</span>}
          {content.publish_url?<a href={content.publish_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Published Post</a>:<span>Published —</span>}
        </div>
      </section>

      <section className="detail-section">
        <div className="panel-head"><h3>Performance</h3><span>{metricsFilled?'Recorded metrics':'No performance data yet'}</span></div>
        <div className="detail-performance">
          <div><small>Views</small><b>{num(content.views)}</b></div>
          <div><small>Reach</small><b>{num(content.reach)}</b></div>
          <div><small>Engagement Rate</small><b>{pct(rate(eng,content.reach))}</b></div>
          <div><small>Share Rate</small><b>{pct(rate(content.shares,content.views))}</b></div>
          <div><small>Transactions</small><b>{num(content.transactions)}</b></div>
          <div><small>Revenue</small><b>{money(content.revenue)}</b></div>
        </div>
      </section>

      <div className="modal-actions detail-actions">
        <button type="button" className="secondary" onClick={onClose}>Close</button>
        <button type="button" className="primary" onClick={onOpenPlan}>Open in Content Plan</button>
      </div>
    </div>
  </div>
}

function SocialLinksModal({content,onClose,onSave}){
  const [instagram,setInstagram]=useState(content.instagram_url||'')
  const [tiktok,setTiktok]=useState(content.tiktok_url||'')
  const validIg=!instagram||/^https?:\/\/(www\.)?instagram\.com\//i.test(instagram)
  const validTt=!tiktok||/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(tiktok)
  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <form className="modal-card social-links-modal" onSubmit={e=>{e.preventDefault();if(validIg&&validTt)onSave(content.id,{instagram_url:instagram,tiktok_url:tiktok})}}>
      <div className="modal-title"><div><div className="eyebrow">SOCIAL PERFORMANCE LINKS</div><h2>{content.title}</h2><p>Paste the published post URL. Saving immediately triggers performance sync.</p></div><button type="button" className="close-btn" onClick={onClose}><X/></button></div>
      <div className="social-link-fields">
        <label><span>Instagram post / Reel URL</span><input value={instagram} onChange={e=>setInstagram(e.target.value)} placeholder="https://www.instagram.com/reel/..."/>{!validIg&&<small className="field-error">Masukkan link Instagram yang valid.</small>}</label>
        <label><span>TikTok video URL</span><input value={tiktok} onChange={e=>setTiktok(e.target.value)} placeholder="https://www.tiktok.com/@account/video/..."/>{!validTt&&<small className="field-error">Masukkan link TikTok yang valid.</small>}</label>
      </div>
      <div className="social-link-explain"><Zap size={17}/><p><b>Auto-sync flow:</b> link disimpan → Content OS mencari post/video ID → mengambil metrics API → menyimpan snapshot → Performance & Insights ter-update otomatis.</p></div>
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!validIg||!validTt}>Save & Sync</button></div>
    </form>
  </div>
}

function NumericInput({value,onChange,step='1',min='0'}){
  return <input
    type="number"
    inputMode="numeric"
    min={min}
    step={step}
    value={value}
    onFocus={e=>{
      if(Number(value)===0){
        onChange('')
        requestAnimationFrame(()=>e.target.select())
      }
    }}
    onChange={e=>onChange(e.target.value===''?'':Number(e.target.value))}
    onBlur={e=>{if(e.target.value==='')onChange(0)}}
  />
}

function MetricsModal({content,metrics,onClose,onSave}){
  const fields=[['views','Views'],['reach','Reach'],['likes','Likes'],['comments','Comments'],['shares','Shares'],['saves','Saves'],['profile_visits','Profile Visits'],['link_clicks','Link Clicks']]
  const [f,setF]=useState(Object.fromEntries(fields.map(([k])=>[k,Number(metrics[k]||0)])))
  const submit=()=>{
    const clean=Object.fromEntries(fields.map(([k])=>[k,Number(f[k]||0)]))
    onSave(content.id,clean)
  }
  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card performance-edit-modal" onSubmit={e=>{e.preventDefault();submit()}}><div className="modal-title"><div><div className="eyebrow">EDIT PERFORMANCE</div><h2>Edit Performance</h2><p>{content.content_code} · {content.title}</p><small className="manual-edit-note">Manual values are preserved until you press Sync again.</small></div><button type="button" className="close-btn" onClick={onClose}><X/></button></div><div className="metrics-form performance-metrics-grid">{fields.map(([k,l])=><label key={k}>{l}<NumericInput value={f[k]} onChange={value=>setF(x=>({...x,[k]:value}))}/></label>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save Changes</button></div></form></div>
}

export default App
