import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  BarChart3, CalendarDays, Columns3, Download, FileUp, Gauge, LayoutDashboard,
  LogOut, Plus, Search, Sparkles, Users, X, ExternalLink, RefreshCw,
  Link2, Zap, CheckCircle2, AlertCircle, Instagram, Music2, ShieldCheck, PlugZap, Pencil, Trash2
} from 'lucide-react'
import { supabase } from './lib/supabase'

const SHARED_EMAIL='businessdevelopmentpb@gmail.com'
const PB_EMBED=new URLSearchParams(window.location.search).get('embed')==='1'
if(PB_EMBED){
  document.body.classList.add('pb-embed')
  const st=document.createElement('style')
  st.textContent='body.pb-embed .app-shell{grid-template-columns:1fr!important}body.pb-embed .app-shell>aside{display:none!important}body.pb-embed .app-shell>main{min-width:0!important}body.pb-embed .login-shell{display:none!important}'
  document.head.appendChild(st)
}

const STAGES = [
  ['idea','Idea'],
  ['approved','Idea Approved'],
  ['editing','Editing / Production'],
  ['revision','Revision'],
  ['published','Published'],
  ['on_hold','Hold'],
  ['cancelled','Cancel']
]
const stageLabel = Object.fromEntries(STAGES)
const WORKFLOW_STAGES = STAGES
const DATE_REQUIRED_STAGES=new Set(['approved','editing','revision','published'])
const requiresPublishDate=status=>DATE_REQUIRED_STAGES.has(status)
const normalizeStatusValue=status=>({
  briefing:'idea',
  production:'editing',
  internal_review:'revision',
  scheduled:'approved'
}[status]||status)
const EMPTY_METRICS={views:0,reach:0,likes:0,comments:0,shares:0,saves:0,profile_visits:0,link_clicks:0,voucher_claims:0,transactions:0,revenue:0}
const CONTENT_BRANDS=['PhotoBebaz','Bebaz Event','Bebaz Adz','BebazLand']
const CONTENT_PILLARS=['Branding','Promotion','Entertain']
const CONTENT_TOPICS=['Branding','Engagement','Education','Information','Trend']
const CONTENT_PLATFORMS=['Instagram','TikTok','Instagram & TikTok']
const CONTENT_TYPES=['Feeds','Video','Carousel','Story']
const cleanText=v=>String(v??'').trim()
const normalizeBrand=b=>b==='PB'?'PhotoBebaz':b==='Bebaz Land'?'BebazLand':b==='BL & PB'?'PhotoBebaz':(CONTENT_BRANDS.includes(b)?b:'PhotoBebaz')
const normalizePlatform=p=>{
  const raw=cleanText(p)
  const key=raw.toLowerCase().replace(/\s+/g,' ')
  if(key==='instagram')return 'Instagram'
  if(key==='tiktok'||key==='tik tok')return 'TikTok'
  if(['instagram & tiktok','instagram and tiktok','instagram+tiktok','instagram + tiktok'].includes(key))return 'Instagram & TikTok'
  return CONTENT_PLATFORMS.includes(raw)?raw:'Instagram & TikTok'
}
const normalizeType=t=>t==='Feed'?'Feeds':(CONTENT_TYPES.includes(t)?t:'Video')
const pickOption=(value,options,fallback,aliases={})=>{
  const raw=cleanText(value)
  if(!raw)return fallback
  const alias=aliases[raw.toLowerCase()]
  if(alias)return alias
  return options.find(x=>x.toLowerCase()===raw.toLowerCase())||fallback
}
const normalizeImportBrand=v=>pickOption(v,CONTENT_BRANDS,'PhotoBebaz',{'pb':'PhotoBebaz','photobebaz':'PhotoBebaz','bebaz land':'BebazLand','bebazland':'BebazLand','bl':'BebazLand','bebaz event':'Bebaz Event','bebaz adz':'Bebaz Adz'})
const normalizeImportPillar=v=>pickOption(v,CONTENT_PILLARS,'Branding')
const normalizeImportTopic=v=>pickOption(v,CONTENT_TOPICS,'Branding')
const normalizeImportPlatform=v=>pickOption(v,CONTENT_PLATFORMS,'Instagram & TikTok',{'tiktok':'TikTok','tik tok':'TikTok','ig':'Instagram','instagram+tiktok':'Instagram & TikTok','instagram & tiktok':'Instagram & TikTok','instagram and tiktok':'Instagram & TikTok'})
const normalizeImportType=v=>pickOption(v,CONTENT_TYPES,'Video',{'feed':'Feeds','feeds':'Feeds','reel':'Video','reels':'Video','story':'Story','stories':'Story'})
const normalizeImportStatus=v=>{
  const raw=cleanText(v).toLowerCase().replace(/[ _-]+/g,' ')
  const aliases={
    'briefing':'idea',
    'production':'editing',
    'editing':'editing',
    'editing / production':'editing',
    'internal review':'revision',
    'approved':'approved',
    'idea approved':'approved',
    'scheduled':'approved',
    'on hold':'on_hold',
    'hold':'on_hold',
    'cancelled':'cancelled',
    'canceled':'cancelled',
    'cancel':'cancelled'
  }
  if(aliases[raw])return aliases[raw]
  const match=STAGES.find(([key,label])=>key.replaceAll('_',' ')===raw||label.toLowerCase()===raw)
  return match?.[0]||'idea'
}
const normalizeImportDate=value=>{
  const raw=cleanText(value)
  if(!raw)return null
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw
  const m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if(m){
    const d=String(Number(m[1])).padStart(2,'0')
    const mo=String(Number(m[2])).padStart(2,'0')
    return m[3]+'-'+mo+'-'+d
  }
  const parsed=new Date(raw)
  if(Number.isNaN(parsed.getTime()))return null
  return parsed.toISOString().slice(0,10)
}
const csvHeaderKey=header=>{
  const k=cleanText(header).toLowerCase().replace(/[._-]+/g,' ').replace(/\s+/g,' ')
  const aliases={
    'posting date':'publish_date','tanggal posting':'publish_date','publish date':'publish_date','date':'publish_date','tanggal':'publish_date','deadline':'publish_date','deadline posting':'publish_date','publish_date':'publish_date',
    'status':'status','title':'title','judul':'title','content title':'title',
    'brand':'brand','pillar':'content_pillar','content pillar':'content_pillar','content_pillar':'content_pillar',
    'topic':'topic','platform':'platform','type':'post_type','tipe':'post_type','post type':'post_type','content type':'post_type','post_type':'post_type',
    'pic':'pic','owner':'pic','caption':'caption','description':'description','deskripsi':'description','copywriting':'copywriting','copy':'copywriting',
    'reference url':'reference_url','referensi url':'reference_url','reference':'reference_url','referensi':'reference_url','link reference':'reference_url','reference_url':'reference_url',
    'reference urls':'reference_urls','multiple references':'reference_urls','references':'reference_urls','referensi urls':'reference_urls',
    'content_code':'content_code','content code':'content_code'
  }
  return aliases[k]||k.replaceAll(' ','_')
}
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
const referenceUrlsFor=content=>{
  const list=Array.isArray(content?.reference_urls)?content.reference_urls:[]
  const legacy=content?.reference_url?[content.reference_url]:[]
  return [...new Set([...legacy,...list].map(x=>String(x||'').trim()).filter(Boolean))]
}

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
    <div className="login-logo-wrap"><img src="/photobebaz-bd-superteam-logo.webp" alt="PhotoBebaz BD Superteam"/></div><h1>Bebaz Content OS</h1><p>Satu link bersama untuk planning, workflow, performance & learning Content Team.</p>
    <label>Shared email<input value={SHARED_EMAIL} type="email" readOnly/></label>
    <label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength="6" required autoFocus/></label>
    <button className="primary wide" disabled={busy}>{busy?'Please wait…':'Sign in'}</button>
    {msg&&<div className="auth-message">{msg}</div>}
  </form></div>
}

const CONTENT_PAGE_KEY='pb:content:lastPage'
const CONTENT_SCROLL_KEY='pb:content:scrollByPage'
const CONTENT_PAGES=['Dashboard','Content Plan','Workflow','Performance','Insights','Social Connections','PIC List']

const readStoredContentPage=()=>{
  try{
    const saved=localStorage.getItem(CONTENT_PAGE_KEY)
    return CONTENT_PAGES.includes(saved)?saved:'Dashboard'
  }catch{return 'Dashboard'}
}
const contentPageSlug=page=>({
  'Dashboard':'dashboard',
  'Content Plan':'content-plan',
  'Workflow':'workflow',
  'Performance':'performance',
  'Insights':'insights',
  'Social Connections':'social-connections',
  'PIC List':'pic-list'
}[page]||String(page||'dashboard').toLowerCase().replace(/\s+/g,'-'))
const readContentScroll=page=>{
  try{
    const all=JSON.parse(sessionStorage.getItem(CONTENT_SCROLL_KEY)||'{}')
    return Number(all?.[page]||0)
  }catch{return 0}
}
const saveContentScroll=(page,y)=>{
  try{
    const all=JSON.parse(sessionStorage.getItem(CONTENT_SCROLL_KEY)||'{}')
    all[page]=Math.max(0,Number(y)||0)
    sessionStorage.setItem(CONTENT_SCROLL_KEY,JSON.stringify(all))
  }catch{}
}

function App(){
  const [session,setSession]=useState(null)
  const [authReady,setAuthReady]=useState(false)
  const [teamMembers,setTeamMembers]=useState([])
  const [page,setPage]=useState(()=>readStoredContentPage())
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
  const [stageDateModal,setStageDateModal]=useState(null)
  const [notice,setNotice]=useState('')
  const fileInput=useRef(null)
  const autoSyncAttempted=useRef(new Set())
  const sessionTokenRef=useRef('')
  const dataLoadedRef=useRef(false)
  const pageRef=useRef(page)

  useEffect(()=>{
    if(PB_EMBED){
      supabase.auth.getSession().then(({data})=>{
        if(data.session){
          sessionTokenRef.current=data.session.access_token||''
          setSession(data.session)
          setAuthReady(true)
        }
      })
    }else{
      supabase.auth.getSession().then(({data})=>{
        sessionTokenRef.current=data.session?.access_token||''
        setSession(data.session)
        setAuthReady(true)
      })
    }
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      sessionTokenRef.current=s?.access_token||''
      setSession(prev=>{
        if(prev?.access_token===s?.access_token&&prev?.user?.id===s?.user?.id)return prev
        return s
      })
      if(!PB_EMBED||s)setAuthReady(true)
    })
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!PB_EMBED)return
    const handler=async e=>{
      const m=e.data||{}
      if(m.source!=='PB_SUPERTEAM')return

      if(m.type==='SESSION'&&m.session?.access_token&&m.session?.refresh_token){
        // Master re-sends SESSION when Chrome regains focus.
        // Do not call setSession again when the exact token is already active.
        if(sessionTokenRef.current===m.session.access_token){
          setAuthReady(true)
          window.parent?.postMessage({source:'PB_MODULE',module:'content',type:'AUTHED'},'*')
          return
        }

        const {data,error}=await supabase.auth.setSession({
          access_token:m.session.access_token,
          refresh_token:m.session.refresh_token
        })
        if(!error&&data?.session){
          sessionTokenRef.current=data.session.access_token||''
          supabase.auth.stopAutoRefresh()
          setSession(prev=>prev?.access_token===data.session.access_token?prev:data.session)
          setAuthReady(true)
          window.parent?.postMessage({source:'PB_MODULE',module:'content',type:'AUTHED'},'*')
        }
      }

      if(m.type==='NAV'&&m.page){
        const aliases={
          'dashboard':'Dashboard',
          'content-plan':'Content Plan',
          'content plan':'Content Plan',
          'workflow':'Workflow',
          'performance':'Performance',
          'insights':'Insights',
          'social-connections':'Social Connections',
          'social connections':'Social Connections',
          'pic-list':'PIC List',
          'pic list':'PIC List'
        }
        const next=aliases[String(m.page).toLowerCase()]||m.page
        if(CONTENT_PAGES.includes(next)&&next!==pageRef.current){
          saveContentScroll(pageRef.current,window.scrollY)
          setPage(next)
        }
      }
    }
    window.addEventListener('message',handler)
    window.parent?.postMessage({source:'PB_MODULE',module:'content',type:'READY'},'*')
    window.parent?.postMessage({source:'PB_MODULE',module:'content',type:'RESTORE_REQUEST',page:contentPageSlug(pageRef.current)},'*')
    return()=>window.removeEventListener('message',handler)
  },[])

  useEffect(()=>{
    pageRef.current=page
    try{localStorage.setItem(CONTENT_PAGE_KEY,page)}catch{}

    if(PB_EMBED){
      window.parent?.postMessage({
        source:'PB_MODULE',
        module:'content',
        type:'PAGE_CHANGED',
        page:contentPageSlug(page),
        title:page
      },'*')
    }

    const y=readContentScroll(page)
    const timer=setTimeout(()=>window.scrollTo(0,y),40)
    return()=>clearTimeout(timer)
  },[page])

  useEffect(()=>{
    const savePosition=()=>saveContentScroll(pageRef.current,window.scrollY)
    const onVisibility=()=>{if(document.visibilityState==='hidden')savePosition()}
    document.addEventListener('visibilitychange',onVisibility)
    window.addEventListener('pagehide',savePosition)
    return()=>{
      document.removeEventListener('visibilitychange',onVisibility)
      window.removeEventListener('pagehide',savePosition)
    }
  },[])

  const loadAll=useCallback(async()=>{
    if(!session?.user?.id)return
    if(!dataLoadedRef.current)setLoading(true)
    const [t,c,m,s]=await Promise.all([
      supabase.from('team_members').select('*').eq('is_active',true).order('name'),
      supabase.from('contents').select('*').order('publish_date',{ascending:false,nullsFirst:false}),
      supabase.from('content_metrics').select('*').order('measured_at',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('social_post_metrics').select('*').order('synced_at',{ascending:false,nullsFirst:false})
    ])
    if(t.error||c.error||m.error||s.error){setNotice(`Load error: ${t.error?.message||c.error?.message||m.error?.message||s.error?.message}`);setLoading(false);return}
    setTeamMembers(t.data||[])
    const content=c.data||[]
    const latestAny={}
    const latestManual={}
    for(const x of (m.data||[])){
      if(!latestAny[x.content_id])latestAny[x.content_id]=x
      if(x.source==='manual'&&!latestManual[x.content_id])latestManual[x.content_id]=x
    }
    const selectedMetrics={}
    for(const row of content){
      selectedMetrics[row.id]=row.performance_manual_override
        ?(latestManual[row.id]||latestAny[row.id]||null)
        :(latestAny[row.id]||null)
    }
    setMetrics(selectedMetrics)
    setSocialMetrics(s.data||[])
    setRows(content)
    dataLoadedRef.current=true
    setLoading(false)
  },[session?.user?.id])

  useEffect(()=>{
    if(session?.user?.id)loadAll()
    else{
      dataLoadedRef.current=false
      setRows([])
      setTeamMembers([])
    }
  },[session?.user?.id,loadAll])
  useEffect(()=>{
    if(!session?.user?.id)return
    const ch=supabase.channel('content-os-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'contents'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'content_metrics'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'social_post_metrics'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},()=>loadAll())
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[session?.user?.id,loadAll])

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
      metric_source:r.performance_manual_override?'manual':(m.source||null),
      social_platforms:socialByContent[r.id]||{},
      pic_name:memberName(r.pic_member_id),
      editor_name:memberName(r.editor_member_id)
    }
  }),[rows,metrics,teamMembers,socialByContent])
  const options=key=>[...new Set(mergedRows.map(r=>r[key]).filter(Boolean))].sort()
  const filtered=useMemo(()=>mergedRows.filter(r=>{
    const month=normalizeStatusValue(r.status)==='idea'?'':(r.publish_date?.slice(0,7)||'')
    const hay=`${r.content_code} ${r.title} ${r.brand} ${r.content_pillar} ${r.topic} ${r.platform} ${r.post_type} ${r.pic_name} ${r.description||''} ${r.caption||''} ${r.copywriting||''} ${referenceUrlsFor(r).join(' ')}`.toLowerCase()
    return (statusFilter==='All'||normalizeStatusValue(r.status)===statusFilter) && (brandFilter==='All'||r.brand===brandFilter) &&
      (platformFilter==='All'||r.platform===platformFilter) && (picFilter==='All'||r.pic_member_id===picFilter) &&
      (monthFilter==='All'||month===monthFilter) && (!query||hay.includes(query.toLowerCase()))
  }).sort((a,b)=>{
    const bt=new Date(b.created_at||b.updated_at||0).getTime()
    const at=new Date(a.created_at||a.updated_at||0).getTime()
    return bt-at
  }),[mergedRows,statusFilter,brandFilter,platformFilter,picFilter,monthFilter,query])

  async function saveContent(payload){
    const status=normalizeStatusValue(payload.status||'idea')
    const normalizedPayload={
      ...payload,
      status,
      platform:normalizePlatform(payload.platform),
      publish_date:status==='idea'?null:(payload.publish_date||null)
    }
    if(requiresPublishDate(status)&&!normalizedPayload.publish_date){
      setNotice('Posting date wajib diisi mulai status Idea Approved.')
      return false
    }
    const code=normalizedPayload.content_code||nextContentCode(normalizedPayload.brand,normalizedPayload.publish_date)
    const {error}=await supabase.from('contents').insert({...normalizedPayload,content_code:code,created_by:session.user.id})
    if(error){setNotice(error.message);return false}
    setShowForm(false); setNotice(`Created ${code}`); await loadAll()
    return true
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
    const status=normalizeStatusValue(payload.status||'idea')
    const clean={
      ...payload,
      status,
      platform:normalizePlatform(payload.platform),
      publish_date:status==='idea'?null:(payload.publish_date||null)
    }
    if(requiresPublishDate(status)&&!clean.publish_date){
      setNotice('Posting date wajib diisi mulai status Idea Approved.')
      return false
    }
    delete clean.id
    delete clean.created_at
    delete clean.updated_at
    delete clean.created_by
    delete clean.pic_name
    delete clean.editor_name
    delete clean.social_platforms
    for(const key of Object.keys(EMPTY_METRICS)) delete clean[key]
    const {error}=await supabase.from('contents').update(clean).eq('id',id)
    if(error){setNotice(error.message);return false}
    setEditContent(null)
    setNotice(`Updated ${payload.content_code||'content'}`)
    await loadAll()
    return true
  }
  function nextContentCode(brand,publishDate,reserved=[]){
    const prefix=(brand||'PB').toLowerCase().includes('land')?'BL':'PB'
    const parsedYear=Number(String(publishDate||'').slice(0,4))
    const year=Number.isFinite(parsedYear)&&parsedYear>2000?parsedYear:new Date().getFullYear()
    const allCodes=[...rows.map(r=>r.content_code),...reserved].filter(Boolean)
    const nums=allCodes.filter(x=>x?.startsWith(`${prefix}-${year}-`)).map(x=>Number(x.split('-').pop())).filter(Number.isFinite)
    return `${prefix}-${year}-${String((Math.max(0,...nums)+1)).padStart(3,'0')}`
  }
  async function applyStageChange(id,target,publishDate){
    const before=rows
    setRows(r=>r.map(x=>x.id===id?{...x,status:target,publish_date:publishDate}:x))
    const {error}=await supabase.from('contents').update({status:target,publish_date:publishDate}).eq('id',id)
    if(error){
      setRows(before)
      setNotice(error.message)
      return false
    }
    if(target==='approved')setNotice('Idea approved dan tanggal posting sudah ditetapkan.')
    return true
  }

  async function moveStage(id,status){
    if(!canEdit)return
    const target=normalizeStatusValue(status)
    const row=rows.find(x=>x.id===id)
    if(!row)return

    const current=normalizeStatusValue(row.status)
    let publishDate=row.publish_date||null

    // Every Idea -> Idea Approved transition must explicitly confirm a posting date.
    // Legacy Idea rows may still carry hidden publish_date values from the old workflow,
    // so never silently reuse them without user confirmation.
    if(current==='idea'&&target==='approved'){
      setStageDateModal({
        id,
        target,
        title:row.title||'Content',
        date:new Date().toISOString().slice(0,10)
      })
      return
    }

    if(requiresPublishDate(target)&&!publishDate){
      setStageDateModal({
        id,
        target,
        title:row.title||'Content',
        date:new Date().toISOString().slice(0,10)
      })
      return
    }

    if(target==='idea')publishDate=null
    await applyStageChange(id,target,publishDate)
  }

  async function confirmStageDate(){
    if(!stageDateModal)return
    const normalized=normalizeImportDate(stageDateModal.date)
    if(!normalized){
      setNotice('Pilih tanggal posting yang valid.')
      return
    }
    const {id,target}=stageDateModal
    const ok=await applyStageChange(id,target,normalized)
    if(ok)setStageDateModal(null)
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

    // Keep manual performance active until the external source really succeeds.
    // A failed/pending sync must never erase or demote valid manual metrics.
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
      else if(data?.status==='waiting_data') setNotice('Performance manual tetap aktif. Source otomatis belum menemukan post dan akan mencoba lagi pada jadwal sync berikutnya.')
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
    const targets=base.filter(r=>r.status==='published'&&(r.instagram_url||r.tiktok_url))
    if(!targets.length)return setNotice('Belum ada published content pada periode ini yang memiliki Instagram/TikTok link.')

    const ids=targets.map(r=>r.id)
    setNotice(`Force syncing ${targets.length} published content…`)

    const {error:resetError}=await supabase
      .from('contents')
      .update({
        auto_sync_performance:true
      })
      .in('id',ids)

    if(resetError){
      setNotice(`Sync All error: ${resetError.message}`)
      return
    }

    for(const row of targets) await syncSocialPerformance(row.id,{quiet:true})
    setNotice('Sync selesai. Data manual tetap aktif untuk post yang source otomatisnya masih pending; auto-sync 8 jam tetap berjalan.')
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
      setNotice(`${platform==='instagram'?'Instagram':'TikTok'} Direct API belum punya developer credentials. Windsor fallback tetap aktif untuk performance sync.`)
      return
    }
    setSocialLoading(true)
    const returnTo=PB_EMBED?'https://photobebaz-bd-superteam.vercel.app':window.location.origin
    const {data,error}=await supabase.functions.invoke('social-oauth',{
      body:{action:'start',platform,return_to:returnTo}
    })
    setSocialLoading(false)
    if(error)return setNotice(`Connect ${platform} error: ${error.message}`)
    if(data?.url){
      if(PB_EMBED){
        const popup=window.open(
          data.url,
          'pb-social-oauth',
          'popup=yes,width=620,height=760,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes'
        )
        if(!popup){
          setNotice('Popup OAuth diblokir browser. Izinkan pop-up untuk PhotoBebaz BD Super Team lalu klik Connect lagi.')
          return
        }
        popup.focus?.()
      }else{
        window.location.href=data.url
      }
    }
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
    const cols=['content_code','publish_date','status','title','description','brand','content_pillar','topic','platform','post_type','schedule_status','caption','copywriting','reference_urls','brief_url','preview_url','publish_url','instagram_url','tiktok_url']
    const csvValue=(r,key)=>key==='reference_urls'?referenceUrlsFor(r).join(' | '):r[key]
    const csv=[cols.join(','),...filtered.map(r=>cols.map(key=>csvEscape(csvValue(r,key))).join(','))].join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`bebaz-content-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)
  }
  function downloadCsvTemplate(){
    const headers=['Status','Judul','Description','Brand','Pillar','Topic','Platform','Type','PIC','Caption','Copywriting','Reference URLs','Tanggal Posting']
    const blank=Array(headers.length).fill('')
    const rows=[headers,...Array.from({length:15},()=>blank)]
    const csv='\ufeff'+rows.map(row=>row.map(csvEscape).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    a.download='Bebaz-Content-Plan-Import-Template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importCsv(file){
    if(!file||!canEdit)return
    try{
      const text=(await file.text()).replace(/^\ufeff/,'')
      const parsed=parseCsv(text).filter(row=>row.some(cell=>cleanText(cell)))
      if(parsed.length<2)return setNotice('CSV kosong. Gunakan tombol CSV Template terlebih dahulu.')

      const headers=parsed[0].map(csvHeaderKey)
      if(!headers.includes('title')){
        return setNotice('Format CSV belum sesuai. Gunakan tombol CSV Template. Kolom wajib: Judul.')
      }
      const items=parsed.slice(1).map(vals=>Object.fromEntries(headers.map((h,i)=>[h,vals[i]??''])))
      const existing=new Set(rows.map(r=>(r.publish_date||'')+'|'+normalizeImportBrand(r.brand)+'|'+cleanText(r.title).toLowerCase()))
      const reserved=[]
      const payload=[]
      let skipped=0
      let missingPic=0
      let badDate=0

      for(const item of items){
        const title=cleanText(item.title)
        if(!title||/^contoh\s*-\s*hapus/i.test(title)){skipped++;continue}

        const status=normalizeImportStatus(item.status)
        const rawDate=cleanText(item.publish_date)
        const publishDate=rawDate?normalizeImportDate(rawDate):null
        if(rawDate&&!publishDate){badDate++;skipped++;continue}
        if(requiresPublishDate(status)&&!publishDate){badDate++;skipped++;continue}

        const brand=normalizeImportBrand(item.brand)
        const fingerprint=(publishDate||'NO_DATE')+'|'+brand+'|'+title.toLowerCase()
        if(existing.has(fingerprint)){skipped++;continue}

        const picRaw=cleanText(item.pic)
        const pic=picRaw?teamMembers.find(p=>cleanText(p.name).toLowerCase()===picRaw.toLowerCase()):null
        if(picRaw&&!pic)missingPic++

        const contentCode=cleanText(item.content_code)||nextContentCode(brand,publishDate,reserved)
        reserved.push(contentCode)
        existing.add(fingerprint)

        payload.push({
          content_code:contentCode,
          publish_date:publishDate,
          status,
          title,
          brand,
          content_pillar:normalizeImportPillar(item.content_pillar),
          topic:normalizeImportTopic(item.topic),
          platform:normalizeImportPlatform(item.platform),
          post_type:normalizeImportType(item.post_type),
          pic_member_id:pic?.id||null,
          description:cleanText(item.description)||null,
          caption:cleanText(item.caption)||null,
          copywriting:cleanText(item.copywriting)||null,
          reference_urls:(cleanText(item.reference_urls)||cleanText(item.reference_url)).split(/\s*\|\s*|\r?\n/).map(x=>x.trim()).filter(Boolean),
          reference_url:((cleanText(item.reference_urls)||cleanText(item.reference_url)).split(/\s*\|\s*|\r?\n/).map(x=>x.trim()).filter(Boolean)[0])||null,
          created_by:session.user.id
        })
      }

      if(!payload.length){
        const hasAnyInput=items.some(item=>Object.values(item).some(v=>cleanText(v)))
        if(!hasAnyInput)return setNotice('Template masih kosong. Isi minimal Judul pada baris kedua, lalu Save as CSV dan Import kembali.')
        const reasons=[]
        if(badDate)reasons.push(badDate+' tanggal invalid / wajib untuk status setelah approval')
        if(skipped)reasons.push(skipped+' baris dilewati')
        return setNotice('Tidak ada baris yang bisa diimport'+(reasons.length?': '+reasons.join(' · '):'.'))
      }

      const {error}=await supabase.from('contents').insert(payload)
      if(error)return setNotice('CSV import error: '+error.message)

      const notes=[payload.length+' content berhasil masuk ke Content Plan']
      if(skipped)notes.push(skipped+' baris dilewati')
      if(missingPic)notes.push(missingPic+' PIC tidak ditemukan → Unassigned')
      if(badDate)notes.push(badDate+' tanggal invalid')
      setNotice(notes.join(' · '))
      await loadAll()
    }finally{
      if(fileInput.current)fileInput.current.value=''
    }
  }
  function parseCsv(text){
    const firstLine=(text.split(/\r?\n/,1)[0]||'')
    const counts={
      ',':(firstLine.match(/,/g)||[]).length,
      ';':(firstLine.match(/;/g)||[]).length,
      '\t':(firstLine.match(/\t/g)||[]).length
    }
    const delimiter=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||','
    let rows=[],row=[],cell='',quoted=false
    for(let i=0;i<text.length;i++){
      const ch=text[i]
      if(ch==='"'){
        if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted
      }else if(ch===delimiter&&!quoted){
        row.push(cell);cell=''
      }else if((ch==='\n'||ch==='\r')&&!quoted){
        if(ch==='\r'&&text[i+1]==='\n')i++
        row.push(cell);rows.push(row);row=[];cell=''
      }else cell+=ch
    }
    if(cell||row.length){row.push(cell);rows.push(row)}
    return rows
  }

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
    if(!PB_EMBED)return
    const onOAuthResult=async e=>{
      const m=e.data||{}
      if(m.source!=='PB_SOCIAL_OAUTH')return
      setPage('Social Connections')
      if(m.connected)setNotice(`${m.connected==='instagram'?'Instagram':'TikTok'} connected successfully.`)
      if(m.error)setNotice(`Social connection failed: ${m.error}`)
      await loadSocialConnections()
      await loadAll()
    }
    window.addEventListener('message',onOAuthResult)
    return()=>window.removeEventListener('message',onOAuthResult)
  },[session])

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
  const inProduction=mergedRows.filter(r=>['editing','revision'].includes(normalizeStatusValue(r.status))).length
  const onSchedule=mergedRows.filter(r=>r.schedule_status==='On Schedule').length
  const totalViews=mergedRows.reduce((s,r)=>s+Number(r.views||0),0)
  const revenue=mergedRows.reduce((s,r)=>s+Number(r.revenue||0),0)
  const nav=[['Dashboard',LayoutDashboard],['Content Plan',CalendarDays],['Workflow',Columns3],['Performance',Gauge],['Insights',BarChart3],['Social Connections',PlugZap],['PIC List',Users]]

  return <div className="app-shell">
    <aside><div className="logo-wrap superteam-logo-wrap"><img src="/photobebaz-bd-superteam-logo.webp" alt="PhotoBebaz BD Superteam"/></div>
      <nav>{nav.map(([n,I])=><button key={n} className={page===n?'active':''} onClick={()=>setPage(n)}><I size={18}/>{n}</button>)}</nav>
      <div className="side-bottom"><div className="user-card"><b>Bebaz Content Team</b><span>Shared login</span></div><button className="ghost" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sign out</button></div>
    </aside>
    <main>
      <header><div><div className="eyebrow">CONTENT GROWTH OPERATING SYSTEM</div><h1>{page}</h1><p>Plan better creative, ship faster, learn from performance, connect content to business impact.</p></div><div className="header-actions"><button className="secondary icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={16}/></button>{canEdit&&<button className="primary" onClick={()=>setShowForm(true)}><Plus size={17}/>New Content</button>}</div></header>
      {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {page==='Dashboard'&&<Dashboard rows={mergedRows} published={published} inProduction={inProduction} onSchedule={onSchedule} totalViews={totalViews} revenue={revenue} onOpenDetail={setDetailContent}/>}
      {page==='Content Plan'&&<ContentPlan rows={filtered} loading={loading} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} brandFilter={brandFilter} setBrandFilter={setBrandFilter} platformFilter={platformFilter} setPlatformFilter={setPlatformFilter} picFilter={picFilter} setPicFilter={setPicFilter} monthFilter={monthFilter} setMonthFilter={setMonthFilter} brands={options('brand')} platforms={options('platform')} teamMembers={teamMembers} months={options('publish_date').map(x=>x.slice(0,7)).filter((x,i,a)=>a.indexOf(x)===i).sort().reverse()} canEdit={canEdit} onEdit={setEditContent} onDelete={deleteContent} onApprove={r=>moveStage(r.id,'approved')} exportCsv={exportCsv} downloadTemplate={downloadCsvTemplate} importClick={()=>fileInput.current?.click()}/>}
      {page==='Workflow'&&<Workflow rows={mergedRows} moveStage={moveStage} canEdit={canEdit}/>}
      {page==='Performance'&&<Performance rows={mergedRows} onEdit={setMetricContent} onEditLinks={setSocialContent} onSync={syncSocialPerformance} onSyncAll={syncAllPublished} syncingIds={syncingIds} canEdit={canEdit}/>}
      {page==='Insights'&&<Insights rows={mergedRows}/>}
      {page==='Social Connections'&&<SocialConnections connections={socialConnections} configured={socialConfigured} callbackUrl={socialCallback} loading={socialLoading} onConnect={connectSocial} onDisconnect={disconnectSocial} onRefresh={loadSocialConnections}/>}
      {page==='PIC List'&&<PicManager teamMembers={teamMembers} onChanged={loadAll} setNotice={setNotice}/>}
      <input ref={fileInput} hidden type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])}/>
    </main>
    {showForm&&<ContentForm teamMembers={teamMembers} onClose={()=>setShowForm(false)} onSave={saveContent}/>}
    {stageDateModal&&<div className="modal">
      <div className="modal-card stage-date-modal">
        <div className="modal-title">
          <div>
            <div className="eyebrow">IDEA APPROVAL</div>
            <h2>Set Posting Date</h2>
            <p><b>{stageDateModal.title}</b> sudah masuk ke Idea Approved. Tentukan kapan konten akan diposting.</p>
          </div>
          <button type="button" className="close-btn" onClick={()=>setStageDateModal(null)}><X size={20}/></button>
        </div>
        <label className="stage-date-field">Posting Date
          <input
            type="date"
            autoFocus
            value={stageDateModal.date||''}
            onChange={e=>setStageDateModal(x=>({...x,date:e.target.value}))}
          />
          <small>Tanggal ini akan masuk ke Content Calendar dan menjadi target posting tim.</small>
        </label>
        <div className="modal-actions stage-date-actions">
          <button type="button" className="secondary" onClick={()=>setStageDateModal(null)}>Cancel</button>
          <button type="button" className="primary" onClick={confirmStageDate} disabled={!stageDateModal.date}>Confirm & Approve</button>
        </div>
      </div>
    </div>}
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
  const monthRows=rows.filter(r=>normalizeStatusValue(r.status)==='idea'||r.publish_date?.slice(0,7)===monthKey)
  const needsReview=monthRows.filter(r=>normalizeStatusValue(r.status)==='revision').length
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
    .filter(r=>normalizeStatusValue(r.status)!=='idea'&&r.publish_date?.slice(0,7)===monthKey)
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
  const approvedThisMonth=monthRows.filter(r=>normalizeStatusValue(r.status)==='approved').length

  return <section className="panel calendar-panel">
    <div className="calendar-head">
      <div>
        <div className="eyebrow">CONTENT CALENDAR</div>
        <h2>{monthName}</h2>
        <p>{monthRows.length} content planned · {publishedThisMonth} published · {approvedThisMonth} idea approved</p>
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
      <span><i className="legend-dot scheduled"/>Idea Approved</span>
      <span><i className="legend-dot editing"/>Editing / Production</span>
      <span><i className="legend-dot review"/>Revision</span>
      <span><i className="legend-dot other"/>Other</span>
    </div>
  </section>
}

function ContentPlan(p){
  const {rows,loading,query,setQuery,statusFilter,setStatusFilter,brandFilter,setBrandFilter,platformFilter,setPlatformFilter,picFilter,setPicFilter,monthFilter,setMonthFilter,brands,platforms,teamMembers,canEdit,onEdit,onDelete,onApprove,exportCsv,downloadTemplate,importClick}=p
  const tableScrollRef=useRef(null)
  const topScrollRef=useRef(null)
  const [tableScrollWidth,setTableScrollWidth]=useState(0)
  const syncingScroll=useRef(false)

  useEffect(()=>{
    const measure=()=>{
      const wrap=tableScrollRef.current
      if(wrap)setTableScrollWidth(wrap.scrollWidth)
    }
    measure()
    const ro=window.ResizeObserver?new ResizeObserver(measure):null
    if(ro&&tableScrollRef.current)ro.observe(tableScrollRef.current)
    window.addEventListener('resize',measure)
    return()=>{
      ro?.disconnect()
      window.removeEventListener('resize',measure)
    }
  },[rows])

  const syncFromTop=e=>{
    if(syncingScroll.current)return
    syncingScroll.current=true
    if(tableScrollRef.current)tableScrollRef.current.scrollLeft=e.currentTarget.scrollLeft
    requestAnimationFrame(()=>{syncingScroll.current=false})
  }

  const syncFromTable=e=>{
    if(syncingScroll.current)return
    syncingScroll.current=true
    if(topScrollRef.current)topScrollRef.current.scrollLeft=e.currentTarget.scrollLeft
    requestAnimationFrame(()=>{syncingScroll.current=false})
  }

  const nudgeTable=direction=>{
    tableScrollRef.current?.scrollBy({left:direction*520,behavior:'smooth'})
    setTimeout(()=>{
      if(topScrollRef.current&&tableScrollRef.current)topScrollRef.current.scrollLeft=tableScrollRef.current.scrollLeft
    },220)
  }

  return <section className="panel"><div className="toolbar">
    <div className="filter-field search-filter"><span>Search</span><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search content, platform, pillar, PIC…"/></div></div>
    <label className="filter-field"><span>Month</span><select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}><option>All</option>{p.months.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Brand</span><select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}><option>All</option>{brands.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Platform</span><select value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)}><option>All</option>{platforms.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="filter-field"><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="All">All status</option>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label className="filter-field"><span>PIC</span><select value={picFilter} onChange={e=>setPicFilter(e.target.value)}><option value="All">All PIC</option>{teamMembers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <button className="secondary toolbar-action" onClick={exportCsv}><Download size={16}/>Export</button>{canEdit&&<button className="secondary toolbar-action" onClick={downloadTemplate}><Download size={16}/>CSV Template</button>}{canEdit&&<button className="secondary toolbar-action" onClick={importClick}><FileUp size={16}/>Import CSV</button>}</div>
    {canEdit&&<div className="csv-import-guide"><b>CSV format</b><span>Status · Judul · Brand · Pillar · Topic · Platform · Type · PIC · Caption · Copywriting · Reference URL · Tanggal Posting</span><small>Wajib: Judul. Tanggal Posting baru wajib mulai status Idea Approved. Idea boleh dikumpulkan tanpa tanggal.</small></div>}

    <div className="content-plan-scroll-tools">
      <div><b>Geser tabel</b><span>Gunakan scrollbar ini tanpa harus turun ke bagian paling bawah.</span></div>
      <div className="content-plan-scroll-buttons">
        <button type="button" className="secondary" onClick={()=>nudgeTable(-1)} aria-label="Geser tabel ke kiri">←</button>
        <button type="button" className="secondary" onClick={()=>nudgeTable(1)} aria-label="Geser tabel ke kanan">→</button>
      </div>
    </div>
    <div
      ref={topScrollRef}
      className="content-plan-top-scroll"
      onScroll={syncFromTop}
      aria-label="Horizontal scroll Content Plan"
    >
      <div style={{width:Math.max(tableScrollWidth,1)}}/>
    </div>

    <div ref={tableScrollRef} className="table-wrap content-plan-table-wrap" onScroll={syncFromTable}>
      <table><thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Title</th><th>Brand</th><th>Pillar</th><th>Topic</th><th>Platform</th><th>Type</th><th>PIC</th><th>Links</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan="12">Loading…</td></tr>:rows.map(r=><tr key={r.id}><td><b>{r.content_code||'-'}</b></td><td>{normalizeStatusValue(r.status)==='idea'?'-':(r.publish_date||'-')}</td><td><div className="content-status-cell"><span className={`status-pill s-${normalizeStatusValue(r.status)}`}>{stageLabel[normalizeStatusValue(r.status)]||r.status}</span>{canEdit&&normalizeStatusValue(r.status)==='idea'&&<button type="button" className="idea-approve-btn" onClick={()=>onApprove(r)}><CheckCircle2 size={12}/>Idea Approved</button>}</div></td><td className="title-cell"><b>{r.title}</b><small>{r.schedule_status||''}</small></td><td>{prettyBrand(r.brand)}</td><td>{r.content_pillar||'-'}</td><td>{r.topic||'-'}</td><td>{r.platform||'-'}</td><td>{r.post_type||'-'}</td><td>{r.pic_name||'-'}</td><td><div className="link-cluster">{r.reference_url&&<a href={r.reference_url} target="_blank" rel="noreferrer" title="Reference"><ExternalLink size={14}/></a>}{r.brief_url&&<a href={r.brief_url} target="_blank" rel="noreferrer" title="Brief"><ExternalLink size={14}/></a>}{r.preview_url&&<a href={r.preview_url} target="_blank" rel="noreferrer" title="Preview"><ExternalLink size={14}/></a>}{r.publish_url&&<a href={r.publish_url} target="_blank" rel="noreferrer" title="Published"><ExternalLink size={14}/></a>}</div></td><td>{canEdit&&<div className="row-actions"><button className="mini-btn edit-content-btn" onClick={()=>onEdit(r)}><Pencil size={13}/>Edit</button><button className="mini-btn delete-content-btn" onClick={()=>onDelete(r)}><Trash2 size={13}/>Delete</button></div>}</td></tr>)}</tbody></table>
    </div>
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
  const monthRows=month==='All'?rows:rows.filter(r=>normalizeStatusValue(r.status)==='idea'||!r.publish_date||r.publish_date?.slice(0,7)===month)
  const boardRef=useRef(null)
  const dragRef=useRef({active:false,startX:0,startScroll:0})

  const scrollBoard=direction=>{
    boardRef.current?.scrollBy({left:direction*620,behavior:'smooth'})
  }

  const onPointerDown=e=>{
    if(e.target.closest('article,select,button,input,a'))return
    const board=boardRef.current
    if(!board)return
    dragRef.current={active:true,startX:e.clientX,startScroll:board.scrollLeft}
    board.classList.add('dragging')
    board.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove=e=>{
    if(!dragRef.current.active||!boardRef.current)return
    boardRef.current.scrollLeft=dragRef.current.startScroll-(e.clientX-dragRef.current.startX)
  }

  const endDrag=e=>{
    dragRef.current.active=false
    boardRef.current?.classList.remove('dragging')
    try{boardRef.current?.releasePointerCapture?.(e.pointerId)}catch{}
  }

  const onWheel=e=>{
    const board=boardRef.current
    if(!board)return

    const maxScroll=board.scrollWidth-board.clientWidth
    if(maxScroll<=0)return

    // Normal mouse-wheel moves the Workflow sideways while the pointer is over the board.
    // Native horizontal trackpad gestures also continue to work.
    if(Math.abs(e.deltaY)>=Math.abs(e.deltaX)){
      const movingRight=e.deltaY>0
      const movingLeft=e.deltaY<0
      const canMoveRight=board.scrollLeft<maxScroll-1
      const canMoveLeft=board.scrollLeft>1

      if((movingRight&&canMoveRight)||(movingLeft&&canMoveLeft)){
        e.preventDefault()
        board.scrollLeft+=e.deltaY
      }
    }
  }

  return <>
    <MonthPeriodBar rows={rows} value={month} onChange={setMonth} label="Workflow period"/>
    <div className="workflow-scroll-tools">
      <div><b>Content Workflow</b><span>Drag board, swipe, or Shift + scroll to move sideways</span></div>
      <div className="workflow-scroll-buttons">
        <button type="button" className="secondary" onClick={()=>scrollBoard(-1)} aria-label="Scroll workflow left">←</button>
        <button type="button" className="secondary" onClick={()=>scrollBoard(1)} aria-label="Scroll workflow right">→</button>
      </div>
    </div>
    <div className="workflow-scroll-shell">
      <div
        ref={boardRef}
        className="kanban"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        {WORKFLOW_STAGES.map(([value,label])=><div className="lane" key={value}><div className="lane-head"><b>{label}</b><span>{monthRows.filter(r=>normalizeStatusValue(r.status)===value).length}</span></div>{monthRows.filter(r=>normalizeStatusValue(r.status)===value).map(r=><article key={r.id}><small>{prettyBrand(r.brand)} · {r.platform||'No platform'}</small><h3>{r.title}</h3><p>{r.pic_name||'No PIC'} · {normalizeStatusValue(r.status)==='idea'?'No date':(r.publish_date||'No date')}</p>{canEdit?<select value={normalizeStatusValue(r.status)} onChange={e=>moveStage(r.id,e.target.value)}>{WORKFLOW_STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<span className="status-pill">{label}</span>}</article>)}</div>)}
      </div>
    </div>
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
          <p>Paste Instagram and/or TikTok post links. Performance auto-sync runs every 8 hours (00:00, 08:00, 16:00 WIB), and Sync buttons can force an immediate refresh anytime.</p>
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
          <td><SocialPlatformCell platform="IG" url={r.instagram_url} metric={ig} manualActive={r.performance_manual_override&&r.metric_source==='manual'}/></td>
          <td><SocialPlatformCell platform="TT" url={r.tiktok_url} metric={tt} manualActive={r.performance_manual_override&&r.metric_source==='manual'}/></td>
          <td>{r.performance_manual_override&&r.metric_source==='manual'
            ?<div className="sync-status sync-manual"><CheckCircle2 size={13}/><div><b>Manual Active</b><small>{['waiting_data','partial'].includes(r.performance_sync_status)?'Auto source retrying · manual data preserved':'Manual performance is protected'}</small></div></div>
            :<div className={`sync-status sync-${r.performance_sync_status||'waiting_link'}`}>
              {['synced','partial'].includes(r.performance_sync_status)?<CheckCircle2 size={13}/>:<AlertCircle size={13}/>}
              <div><b>{statusLabel(r.performance_sync_status)}</b><small>{r.performance_sync_error|| (r.last_performance_sync_at?new Date(r.last_performance_sync_at).toLocaleString('id-ID'):'Never synced')}</small></div>
            </div>}</td>
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


function SocialPlatformCell({platform,url,metric,manualActive=false}){
  if(!url)return <span className="social-empty">No link</span>
  return <div className="social-platform-cell">
    <a href={url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>{platform}</a>
    {metric?.synced_at
      ?<small>{num(metric.views)} views</small>
      :manualActive
        ?<small>Manual data active</small>
        :<small>Waiting sync</small>}
  </div>
}

function contentPreviewSource(row){
  const igMetric=row.social_platforms?.instagram||null
  const ttMetric=row.social_platforms?.tiktok||null
  const igUrl=row.instagram_url||igMetric?.post_url||''
  const ttUrl=row.tiktok_url||ttMetric?.post_url||''
  const published=row.publish_url||''

  const platform=normalizePlatform(row.platform)
  if(platform==='TikTok'&&ttUrl)return {platform:'TikTok',url:ttUrl,externalId:ttMetric?.external_post_id||''}
  if(platform==='Instagram'&&igUrl)return {platform:'Instagram',url:igUrl,externalId:igMetric?.external_post_id||''}

  if(platform==='Instagram & TikTok'){
    const igViews=Number(igMetric?.views||0)
    const ttViews=Number(ttMetric?.views||0)
    if(ttUrl&&(!igUrl||ttViews>=igViews))return {platform:'TikTok',url:ttUrl,externalId:ttMetric?.external_post_id||''}
    if(igUrl)return {platform:'Instagram',url:igUrl,externalId:igMetric?.external_post_id||''}
  }

  if(/tiktok\.com/i.test(published))return {platform:'TikTok',url:published,externalId:ttMetric?.external_post_id||''}
  if(/instagram\.com/i.test(published))return {platform:'Instagram',url:published,externalId:igMetric?.external_post_id||''}
  if(ttUrl)return {platform:'TikTok',url:ttUrl,externalId:ttMetric?.external_post_id||''}
  if(igUrl)return {platform:'Instagram',url:igUrl,externalId:igMetric?.external_post_id||''}
  if(published)return {platform:'Published',url:published,externalId:''}
  return null
}

function socialEmbedUrl(source){
  if(!source?.url)return null

  if(source.platform==='Instagram'){
    try{
      const u=new URL(source.url)
      const parts=u.pathname.split('/').filter(Boolean)
      const type=parts[0]
      const code=parts[1]
      if(!['p','reel','reels','tv'].includes(type)||!code)return null
      const normalizedType=type==='reels'?'reel':type
      return `https://www.instagram.com/${normalizedType}/${code}/embed/`
    }catch{return null}
  }

  if(source.platform==='TikTok'){
    let id=String(source.externalId||'')
    if(!id){
      const m=String(source.url).match(/\/video\/(\d+)/)
      if(m)id=m[1]
    }
    return id?`https://www.tiktok.com/player/v1/${id}?autoplay=0&loop=0&controls=1&progress_bar=0&fullscreen_button=1&volume_control=0&music_info=0&description=0&rel=0`:null
  }

  return null
}

function TopContentPreview({row,onOpen}){
  const source=contentPreviewSource(row)
  if(!source){
    return <div className="top-content-preview no-preview"><span>NO</span><small>PREVIEW</small></div>
  }

  const embed=socialEmbedUrl(source)
  return <button
    type="button"
    className={`top-content-preview preview-${source.platform.toLowerCase().replace(/\s+/g,'-')}`}
    onClick={()=>onOpen?.({row,source,embed})}
    title={`Watch ${source.platform} preview`}
  >
    <div className="top-content-preview-bg">
      <b>{source.platform==='Instagram'?'IG':source.platform==='TikTok'?'TT':'POST'}</b>
      <small>Watch Here</small>
    </div>
    {embed&&<iframe
      src={embed}
      title={`${row.title} preview`}
      loading="lazy"
      scrolling="no"
      tabIndex="-1"
      aria-hidden="true"
      allow="encrypted-media; picture-in-picture"
    />}
    <span className="preview-open">▶</span>
  </button>
}

function ContentPreviewModal({preview,onClose}){
  if(!preview)return null
  const {row,source,embed}=preview
  return <div className="modal content-preview-modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="content-preview-card">
      <div className="content-preview-head">
        <div>
          <div className="eyebrow">{source.platform} PREVIEW</div>
          <h2>{row.title}</h2>
          <p>{row.content_code} · {row.publish_date||'-'}</p>
        </div>
        <button type="button" className="close-btn" onClick={onClose}><X size={20}/></button>
      </div>

      <div className={`content-preview-player player-${source.platform.toLowerCase().replace(/\s+/g,'-')}`}>
        {embed
          ?<iframe
            src={embed}
            title={`${row.title} full preview`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
          :<div className="preview-unavailable"><b>Preview tidak tersedia di dalam sistem.</b><span>Gunakan tombol Open Original Post.</span></div>}
      </div>

      <div className="content-preview-footer">
        <div>
          <small>Performance</small>
          <b>{num(row.views)} views · {num(row.shares)} shares</b>
        </div>
        <a href={source.url} target="_blank" rel="noreferrer" className="secondary"><ExternalLink size={14}/>Open Original Post</a>
      </div>
    </div>
  </div>
}

function Insights({rows}){
  const [month,setMonth]=useState(currentMonthKey)
  const [preview,setPreview]=useState(null)
  const monthRows=month==='All'?rows:rows.filter(r=>r.publish_date?.slice(0,7)===month)
  const manualRows=monthRows.filter(r=>r.metric_source==='manual'&&(
    Number(r.views||0)>0||Number(r.reach||0)>0||Number(r.likes||0)>0||
    Number(r.comments||0)>0||Number(r.shares||0)>0||Number(r.saves||0)>0||Number(r.revenue||0)>0
  ))
  const by=key=>Object.entries(monthRows.reduce((a,r)=>{const k=key==='platform'?normalizePlatform(r[key]):(r[key]||'Unclassified');if(!a[k])a[k]={count:0,views:0,shares:0,revenue:0};a[k].count++;a[k].views+=Number(r.views||0);a[k].shares+=Number(r.shares||0);a[k].revenue+=Number(r.revenue||0);return a},{})).sort((a,b)=>b[1].views-a[1].views||b[1].count-a[1].count)
  const top=[...monthRows].filter(r=>Number(r.views||0)>0).sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,8)
  return <>
    <MonthPeriodBar rows={rows} value={month} onChange={setMonth} label="Insights period"/>
    <div className="insights-period-summary"><b>{formatMonthKey(month)}</b><span>{monthRows.length} content analyzed · {manualRows.length} manual performance included</span></div>
    <div className="three-col">{[['Content Pillar','content_pillar'],['Platform','platform'],['Post Type','post_type']].map(([title,key])=><section className="panel" key={key}><h2>{title}</h2>{by(key).map(([name,v])=><div className="insight-row" key={name}><div><b>{name}</b><small>{v.count} content</small></div><div><b>{num(v.views)} views</b><small>{num(v.shares)} shares · {money(v.revenue)}</small></div></div>)}</section>)}</div>
    <section className="panel top-panel"><div className="panel-head"><div><h2>Top-performing content</h2><small className="pipeline-month">{formatMonthKey(month)}</small></div><span>{top.length? 'Auto sync + manual performance':'No performance data recorded yet'}</span></div>{top.length?top.map((r,i)=><div className="top-row" key={r.id}><b className="top-rank">#{i+1}</b><TopContentPreview row={r} onOpen={setPreview}/><div className="top-content-copy"><strong>{r.title}</strong><small>{r.content_code} · {r.platform} · {r.publish_date||'-'} · {r.metric_source==='manual'?'Manual':'Synced'}</small></div><div className="top-content-metrics"><strong>{num(r.views)} views</strong><small>{num(r.shares)} shares · {money(r.revenue)}</small></div></div>):<div className="empty-state">No performance data recorded for {formatMonthKey(month)}.</div>}</section>
    {preview&&<ContentPreviewModal preview={preview} onClose={()=>setPreview(null)}/>}
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
  const initialReferences=referenceUrlsFor(content)
  const initial={
    content_code:content?.content_code||'',
    title:content?.title||'',
    description:content?.description||'',
    publish_date:normalizeStatusValue(content?.status||'idea')==='idea'?'':(content?.publish_date||''),
    status:normalizeStatusValue(content?.status||'idea'),
    brand:normalizeBrand(content?.brand),
    content_pillar:CONTENT_PILLARS.includes(content?.content_pillar)?content.content_pillar:'Branding',
    topic:CONTENT_TOPICS.includes(content?.topic)?content.topic:'Branding',
    platform:normalizePlatform(content?.platform),
    post_type:normalizeType(content?.post_type),
    pic_member_id:content?.pic_member_id||'',
    caption:content?.caption||'',
    copywriting:content?.copywriting||'',
    copywriting_image_paths:Array.isArray(content?.copywriting_image_paths)?content.copywriting_image_paths:[],
    brief_url:content?.brief_url||'',
    preview_url:content?.preview_url||'',
    publish_url:content?.publish_url||'',
    objective:content?.objective||'',
    hook:content?.hook||'',
    cta:content?.cta||'',
    notes:content?.notes||''
  }
  const [f,setF]=useState(initial)
  const [references,setReferences]=useState(initialReferences.length?initialReferences:[''])
  const [newImages,setNewImages]=useState([])
  const [existingSigned,setExistingSigned]=useState({})
  const [removedExisting,setRemovedExisting]=useState([])
  const [saving,setSaving]=useState(false)
  const [formError,setFormError]=useState('')
  const imageInput=useRef(null)
  const set=(k,v)=>setF(x=>({...x,[k]:v===''?null:v}))
  const select=(label,key,values)=><label>{label}<select value={f[key]||''} onChange={e=>set(key,e.target.value)}>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>

  useEffect(()=>{
    const paths=f.copywriting_image_paths||[]
    if(!paths.length){setExistingSigned({});return}
    let active=true
    supabase.storage.from('content-assets').createSignedUrls(paths,60*60).then(({data})=>{
      if(!active)return
      const map={}
      ;(data||[]).forEach((item,i)=>{if(item?.signedUrl)map[paths[i]]=item.signedUrl})
      setExistingSigned(map)
    })
    return()=>{active=false}
  },[(f.copywriting_image_paths||[]).join('|')])

  const addImageFile=file=>{
    if(!file||!String(file.type||'').startsWith('image/'))return
    if(file.size>8*1024*1024){setFormError('Ukuran gambar maksimal 8 MB per file.');return}
    if((f.copywriting_image_paths?.length||0)+newImages.length>=6){setFormError('Maksimal 6 gambar referensi copywriting per content.');return}
    const preview=URL.createObjectURL(file)
    setNewImages(x=>[...x,{id:crypto.randomUUID(),file,preview}])
    setFormError('')
  }

  const handlePaste=e=>{
    const item=[...(e.clipboardData?.items||[])].find(x=>String(x.type||'').startsWith('image/'))
    if(!item)return
    const file=item.getAsFile()
    if(file){e.preventDefault();addImageFile(file)}
  }

  const removeNewImage=id=>{
    setNewImages(x=>{
      const found=x.find(i=>i.id===id)
      if(found?.preview)URL.revokeObjectURL(found.preview)
      return x.filter(i=>i.id!==id)
    })
  }

  const removeExistingImage=path=>{
    setF(x=>({...x,copywriting_image_paths:(x.copywriting_image_paths||[]).filter(p=>p!==path)}))
    setRemovedExisting(x=>x.includes(path)?x:[...x,path])
  }

  const updateReference=(index,value)=>setReferences(x=>x.map((v,i)=>i===index?value:v))
  const addReference=()=>setReferences(x=>x.length>=10?x:[...x,''])
  const removeReference=index=>setReferences(x=>{
    const next=x.filter((_,i)=>i!==index)
    return next.length?next:['']
  })

  const uploadNewImages=async()=>{
    const paths=[]
    for(const item of newImages){
      const ext=(item.file.name?.split('.').pop()||item.file.type?.split('/').pop()||'png').replace(/[^a-z0-9]/gi,'').toLowerCase()||'png'
      const storagePath='copywriting/'+new Date().toISOString().slice(0,10)+'/'+crypto.randomUUID()+'.'+ext
      const {error}=await supabase.storage.from('content-assets').upload(storagePath,item.file,{
        cacheControl:'3600',
        upsert:false,
        contentType:item.file.type||'image/png'
      })
      if(error){
        if(paths.length)await supabase.storage.from('content-assets').remove(paths)
        throw error
      }
      paths.push(storagePath)
    }
    return paths
  }

  const submit=async e=>{
    e.preventDefault()
    if(saving)return
    if(requiresPublishDate(f.status)&&!f.publish_date){
      window.alert('Posting date wajib diisi mulai status Idea Approved.')
      return
    }
    const cleanRefs=[...new Set(references.map(x=>String(x||'').trim()).filter(Boolean))]
    setSaving(true)
    setFormError('')
    let uploaded=[]
    try{
      uploaded=await uploadNewImages()
      const payload={
        ...f,
        description:String(f.description||'').trim()||null,
        publish_date:f.status==='idea'?null:(f.publish_date||null),
        reference_urls:cleanRefs,
        reference_url:cleanRefs[0]||null,
        copywriting_image_paths:[...(f.copywriting_image_paths||[]),...uploaded]
      }
      const ok=await onSave(payload)
      if(!ok){
        if(uploaded.length)await supabase.storage.from('content-assets').remove(uploaded)
        setSaving(false)
        return
      }
      if(removedExisting.length)await supabase.storage.from('content-assets').remove(removedExisting)
      newImages.forEach(i=>i.preview&&URL.revokeObjectURL(i.preview))
    }catch(err){
      setFormError(err?.message||'Gagal menyimpan gambar copywriting.')
      if(uploaded.length)await supabase.storage.from('content-assets').remove(uploaded)
      setSaving(false)
    }
  }

  return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&!saving&&onClose()}>
    <form className="modal-card large content-form-modal" onSubmit={submit}>
      <div className="modal-title">
        <div>
          <div className="eyebrow">{editing?'REVISE CONTENT':'NEW CONTENT'}</div>
          <h2>{editing?'Edit Content':'New Content'}</h2>
          <p>{editing?(content.content_code+' · Update planning tanpa membuat record baru.'):'Create one accountable content record.'}</p>
        </div>
        <button type="button" className="close-btn" onClick={onClose} disabled={saving}><X/></button>
      </div>

      <div className="form-grid">
        <label className="span2">Title<input required value={f.title||''} onChange={e=>set('title',e.target.value)}/></label>
        <label>Status<select value={f.status||'idea'} onChange={e=>{
          const next=e.target.value
          setF(x=>({...x,status:next,publish_date:next==='idea'?null:x.publish_date}))
        }}>{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><small className="field-help">Idea tidak membutuhkan tanggal posting.</small></label>

        {(requiresPublishDate(f.status)||Boolean(f.publish_date))&&<label>Posting Date {requiresPublishDate(f.status)?'*':''}<input type="date" required={requiresPublishDate(f.status)} value={f.publish_date||''} onChange={e=>set('publish_date',e.target.value)}/><small className="field-help">{requiresPublishDate(f.status)?'Wajib setelah Idea Approved.':'Tanggal existing; boleh dikosongkan jika belum dijadwalkan.'}</small></label>}

        {select('Brand','brand',CONTENT_BRANDS)}
        <label>PIC<select value={f.pic_member_id||''} onChange={e=>set('pic_member_id',e.target.value)}><option value="">Unassigned</option>{teamMembers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {select('Pillar','content_pillar',CONTENT_PILLARS)}
        {select('Topic','topic',CONTENT_TOPICS)}
        {select('Platform','platform',CONTENT_PLATFORMS)}
        {select('Type','post_type',CONTENT_TYPES)}

        <label className="span3 content-description-field">Description
          <textarea rows="4" value={f.description||''} onChange={e=>set('description',e.target.value)} placeholder="Jelaskan ide, angle, objective singkat, talent/location, atau context yang perlu dipahami tim…"/>
        </label>

        <div className="span3 creative-writing-pair">
          <label>Caption
            <textarea rows="6" value={f.caption||''} onChange={e=>set('caption',e.target.value)} placeholder="Caption final untuk Instagram / TikTok…"/>
          </label>

          <div className="copywriting-composer">
            <label>Copywriting
              <textarea rows="6" value={f.copywriting||''} onChange={e=>set('copywriting',e.target.value)} onPaste={handlePaste} placeholder="Script, wording, headline, atau text yang tampil di konten…"/>
            </label>

            <div className="copywriting-paste-zone" tabIndex="0" onPaste={handlePaste}>
              <div>
                <b>Paste reference image — Ctrl+V</b>
                <span>Copy screenshot dari WhatsApp / browser lalu paste di area ini. Bisa sampai 6 gambar.</span>
              </div>
              <button type="button" className="secondary copy-image-upload" onClick={()=>imageInput.current?.click()}>Choose Image</button>
              <input ref={imageInput} hidden type="file" accept="image/*" multiple onChange={e=>{
                ;[...(e.target.files||[])].forEach(addImageFile)
                e.target.value=''
              }}/>
            </div>

            {((f.copywriting_image_paths||[]).length>0||newImages.length>0)&&<div className="copywriting-image-grid">
              {(f.copywriting_image_paths||[]).map(path=><div className="copywriting-image-card" key={path}>
                {existingSigned[path]?<img src={existingSigned[path]} alt="Copywriting reference"/>:<div className="image-loading">Loading…</div>}
                <button type="button" onClick={()=>removeExistingImage(path)} title="Remove image"><X size={14}/></button>
              </div>)}
              {newImages.map(item=><div className="copywriting-image-card" key={item.id}>
                <img src={item.preview} alt="New copywriting reference"/>
                <button type="button" onClick={()=>removeNewImage(item.id)} title="Remove image"><X size={14}/></button>
                <small>NEW</small>
              </div>)}
            </div>}
          </div>
        </div>

        <div className="span3 reference-builder">
          <div className="reference-builder-head">
            <div><b>References</b><span>Tambahkan semua link referensi yang dipakai tim.</span></div>
            <button type="button" className="secondary" onClick={addReference} disabled={references.length>=10}><Plus size={14}/>Add Reference</button>
          </div>
          <div className="reference-list">
            {references.map((url,index)=><div className="reference-row" key={index}>
              <span>{index+1}</span>
              <input type="url" value={url} onChange={e=>updateReference(index,e.target.value)} placeholder="https://..."/>
              <button type="button" className="reference-remove" onClick={()=>removeReference(index)} title="Remove reference"><X size={15}/></button>
            </div>)}
          </div>
        </div>
      </div>

      {formError&&<div className="content-form-error">{formError}</div>}
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="primary" disabled={saving}>{saving?'Saving…':editing?'Save Revision':'Create Content'}</button>
      </div>
    </form>
  </div>
}

function PrivateAssetGallery({paths=[]}){
  const [urls,setUrls]=useState({})
  useEffect(()=>{
    if(!paths.length){setUrls({});return}
    let active=true
    supabase.storage.from('content-assets').createSignedUrls(paths,60*60).then(({data})=>{
      if(!active)return
      const map={}
      ;(data||[]).forEach((item,i)=>{if(item?.signedUrl)map[paths[i]]=item.signedUrl})
      setUrls(map)
    })
    return()=>{active=false}
  },[paths.join('|')])

  if(!paths.length)return null
  return <div className="detail-asset-grid">
    {paths.map((path,i)=>urls[path]
      ?<a href={urls[path]} target="_blank" rel="noreferrer" key={path}><img src={urls[path]} alt={'Copywriting reference '+(i+1)}/></a>
      :<div className="image-loading" key={path}>Loading…</div>)}
  </div>
}

function ContentDetail({content,onClose,onOpenPlan}){
  const metricsFilled=['views','reach','likes','comments','shares','saves','profile_visits','link_clicks'].some(k=>Number(content[k]||0)>0)
  const eng=Number(content.likes||0)+Number(content.comments||0)+Number(content.shares||0)+Number(content.saves||0)
  const publishedLinks=[
    content.publish_url?{label:'Open Published Post',url:content.publish_url}:null,
    content.instagram_url?{label:'Open Instagram',url:content.instagram_url}:null,
    content.tiktok_url?{label:'Open TikTok',url:content.tiktok_url}:null
  ].filter(Boolean)
  const seenPublished=new Set()
  const uniquePublishedLinks=publishedLinks.filter(link=>{
    const key=String(link.url||'').replace(/[?#].*$/,'').replace(/\/$/,'')
    if(seenPublished.has(key))return false
    seenPublished.add(key)
    return true
  })
  const detailRows=[
    ['Content ID',content.content_code||'-'],
    ['Posting date',normalizeStatusValue(content.status)==='idea'?'Not scheduled yet':(content.publish_date||'Not scheduled yet')],
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
          <div className="detail-copy detail-copy-main"><small>Caption</small><p>{content.caption||'—'}</p></div>
          <div className="detail-copy detail-copy-main"><small>Copywriting</small><p>{content.copywriting||'—'}</p></div>
        </section>
      </div>

      <section className="detail-section">
        <div className="panel-head"><h3>Links</h3></div>
        <div className="detail-links">
          {content.reference_url&&<a href={content.reference_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Reference</a>}
          {content.brief_url&&<a href={content.brief_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Brief</a>}
          {content.preview_url&&<a href={content.preview_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Preview</a>}
          {uniquePublishedLinks.map(link=><a key={link.label+link.url} className="published-link" href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>{link.label}</a>)}
          {!content.reference_url&&!content.brief_url&&!content.preview_url&&!uniquePublishedLinks.length&&<span>No links added yet</span>}
        </div>
      </section>

      <section className="detail-section">
        <div className="panel-head"><h3>Performance</h3><span>{metricsFilled?'Recorded metrics':'No performance data yet'}</span></div>
        <div className="detail-performance detail-performance-compact">
          <div><small>Views</small><b>{num(content.views)}</b></div>
          <div><small>Reach</small><b>{num(content.reach)}</b></div>
          <div><small>Engagement Rate</small><b>{pct(rate(eng,content.reach||content.views))}</b></div>
          <div><small>Share Rate</small><b>{pct(rate(content.shares,content.views))}</b></div>
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
