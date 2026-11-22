import { useState, type FormEvent, type ReactNode } from 'react'
import { AuthOverlay, signOut, useAuth, useMutations, useQuery } from 'deepspace'
import { ArrowUpRight, Bookmark, Compass, Search, UserRound } from 'lucide-react'
import { CalendarReminder, FitSummary, WebSearch } from '../../components/LaunchpadIntegrations'
import { defaultProfile, profileSkills, readListing, readPreviousTracker, safeUrl, sampleJobs, skills, sponsorships, statuses, years, type Application, type Job, type Profile } from '../../opportunities'
import '../../launchpad.css'

type View='Explore'|'My tracker'|'Profile'
const views:View[]=['Explore','My tracker','Profile']
const levelOptions=['Internship','New graduate']
function toggle(values:string[],value:string) {
  return values.includes(value)?values.filter(item=>item!==value):[...values,value]
}
function Choices({label,options,values,onChange}:{label:string;options:readonly string[];values:string[];onChange:(values:string[])=>void}) {
  return <details className="multi"><summary>{label}{values.length>0&&<span>{values.length}</span>}</summary>
    <div className="choices" role="group" aria-label={label}>{options.map(value=><label key={value}>
      <input type="checkbox" checked={values.includes(value)} onChange={()=>onChange(toggle(values,value))}/>{value}
    </label>)}</div>
  </details>
}
function Field({label,value,options,onChange}:{label:string;value:string;options:readonly string[];onChange:(value:string)=>void}) {
  return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select></label>
}
function ProfileEditor({initial,save}:{initial:Profile;save:(profile:Profile)=>Promise<void>}) {
  const [draft,setDraft]=useState(initial)
  const [phase,setPhase]=useState<'idle'|'loading'|'saved'|'error'>('idle')
  const [error,setError]=useState('')
  const chosen=profileSkills(draft)
  function patch(values:Partial<Profile>) {setDraft({...draft,...values});setPhase('idle')}
  async function submit(event:FormEvent) {
    event.preventDefault()
    setPhase('loading')
    try {await save({...draft,location:draft.location.trim()||'Any'});setPhase('saved')}
    catch(cause){setError(cause instanceof Error?cause.message:'Profile could not be saved.');setPhase('error')}
  }
  return <form className="profile-panel" onSubmit={submit}>
    <fieldset disabled={phase==='loading'}>
      <div className="profile-fields">
        <Field label="Class year or experience" value={draft.year} options={['Any',...years]} onChange={year=>patch({year})}/>
        <label>Location preference<input value={draft.location==='Any'?'':draft.location} maxLength={100} placeholder="e.g. Chicago or Remote" onChange={e=>patch({location:e.target.value})}/></label>
        <Field label="Sponsorship preference" value={draft.sponsorship} options={['Any','Need sponsorship','No preference']} onChange={sponsorship=>patch({sponsorship})}/>
      </div>
      <fieldset className="profile-skills"><legend>My skills</legend>{skills.map(skill=><label key={skill}>
        <input type="checkbox" checked={chosen.includes(skill)} onChange={()=>patch({skills:JSON.stringify(toggle(chosen,skill))})}/>{skill}
      </label>)}</fieldset>
      <button className="primary">{phase==='loading'?'Saving…':phase==='error'?'Retry profile save':'Save profile'}</button>
    </fieldset>
    {phase==='saved'&&<p role="status">Profile saved.</p>}
    {phase==='error'&&<p role="alert" className="error">{error}</p>}
  </form>
}
function JobCard({job,profile,authenticated,children}:{job:Job;profile:Profile;authenticated:boolean;children:ReactNode}) {
  const [expanded,setExpanded]=useState(false)
  const selected=profileSkills(profile)
  const matching=job.skills.filter(skill=>selected.includes(skill))
  const missing=job.skills.filter(skill=>!selected.includes(skill))
  const href=safeUrl(job.url)
  const preference=[
    profile.year!=='Any' ? job.classifications.includes(profile.year)?'Class year mentioned.':job.classifications.length?'Other class years are mentioned.':'Class year is unspecified.' : '',
    profile.location!=='Any' && profile.location.trim() ? job.location.toLowerCase().includes(profile.location.toLowerCase())?'Location preference appears in the listing.':'Preferred location is unconfirmed.' : '',
    profile.sponsorship==='Need sponsorship' && job.sponsorship!=='Available'?'Confirm sponsorship with the employer.':'',
  ].filter(Boolean).join(' ')
  return <article className="job-card">
    <div className="card-top"><span className="monogram" aria-hidden="true">{job.company.slice(0,2).toUpperCase()}</span><span className="source">{job.source}</span></div>
    <div><p className="company">{job.company}</p><h3>{job.title}</h3><p className="location">{job.location}</p></div>
    <div className="tags"><span>{job.level}</span><span className={job.sponsorship==='Available'?'available':''}>Sponsorship · {job.sponsorship.toLowerCase()}</span>{job.classifications.map(year=><span key={year}>{year}</span>)}</div>
    {job.sponsorshipNote&&<small className="muted">{job.sponsorshipNote}</small>}
    <div className="fit">
      <strong>{selected.length?`${matching.length} matching skill${matching.length===1?'':'s'}`:'Skills mentioned'}</strong>
      <p>{selected.length?(matching.join(', ')||'No selected skills appear in the listing text.'):(job.skills.join(', ')||'No specific skills were identified.')}</p>
      {selected.length>0&&missing.length>0&&<p><b>Other skills mentioned</b> · {missing.join(', ')}</p>}
      {selected.length>0&&<small>{preference ? preference+' ' : ''}Confirm which qualifications are required with the employer.</small>}
    </div>
    <div className="card-actions">{href&&<a href={href} target="_blank" rel="noreferrer">Original posting <ArrowUpRight size={14}/></a>}{children}</div>
    {authenticated&&<><button type="button" className="quiet detail" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Hide fit details':'More fit details'}</button>
      {expanded&&<FitSummary key={selected.join(',')} job={job} skills={selected}/>}</>}
  </article>
}

export default function Launchpad() {
  const {isSignedIn,userId}=useAuth()
  const [login,setLogin]=useState(false)
  const [view,setView]=useState<View>('Explore')
  const [query,setQuery]=useState('')
  const [levels,setLevels]=useState<string[]>([])
  const [locations,setLocations]=useState<string[]>([])
  const [sponsors,setSponsors]=useState<string[]>([])
  const [classes,setClasses]=useState<string[]>([])
  const [selected,setSelected]=useState<string[]>([])
  const [mode,setMode]=useState('Any selected skill')
  const [web,setWeb]=useState<Job[]>([])
  const [stage,setStage]=useState<string[]>([])
  const [pending,setPending]=useState<string[]>([])
  const [error,setError]=useState('')
  const [calendar,setCalendar]=useState('')
  const [previous]=useState(readPreviousTracker)
  const [importing,setImporting]=useState(false)
  const profiles=useQuery<Profile>('student_profiles',{limit:1})
  const applications=useQuery<Application>('student_applications',{limit:500,orderBy:'createdAt',orderDir:'desc'})
  const profileWrites=useMutations<Profile & {userId:string}>('student_profiles')
  const applicationWrites=useMutations<Application & {userId:string}>('student_applications')
  const profileRecord=isSignedIn?profiles.records[0]:undefined
  const profile=profileRecord?.data||defaultProfile
  const saved=isSignedIn?applications.records:[]
  const listings=[...web,...sampleJobs.filter(sample=>!web.some(job=>job.key===sample.key))]
  const locationOptions=['Remote',...new Set([...locations,...listings.map(job=>job.location)].filter(value=>value!=='Remote'&&value!=='See posting'))].sort()
  const importable=previous.filter(entry=>!saved.some(record=>record.data.jobKey===entry.jobKey))
  const normalized=query.trim().toLowerCase()
  const active=Boolean(normalized||levels.length||locations.length||sponsors.length||classes.length||selected.length)
  const shown=listings.filter(job=>
    (!normalized||[job.title,job.company,job.location,...job.skills].join(' ').toLowerCase().includes(normalized)) &&
    (!levels.length||levels.includes(job.level)) && (!locations.length||locations.includes(job.location)||(locations.includes('Remote')&&/\bremote\b/i.test(job.location))) &&
    (!sponsors.length||sponsors.includes(job.sponsorship)) &&
    (!classes.length||(job.classifications.length?job.classifications.some(year=>classes.includes(year)):classes.includes('None'))) &&
    (!selected.length||(mode==='All selected skills'?selected.every(skill=>job.skills.includes(skill)):selected.some(skill=>job.skills.includes(skill))))
  )
  const tracked=saved.filter(record=>!stage.length||stage.includes(record.data.status))
  function visit(next:View) {
    if(next!=='Explore'&&!isSignedIn) {setLogin(true);return}
    setError('')
    setView(next)
  }
  async function saveProfile(draft:Profile) {
    if(!profileWrites.ready||!userId) throw Error('Connecting to your profile. Try again in a moment.')
    if(profileRecord) await profileWrites.putConfirmed(profileRecord.recordId,draft)
    else await profileWrites.createConfirmed({...draft,userId})
  }
  async function write(key:string,action:()=>Promise<unknown>) {
    if(pending.includes(key)) return
    setError('')
    setPending(current=>[...current,key])
    try {await action()} catch(cause){setError(cause instanceof Error?cause.message:'Your change could not be saved. Try again.')}
    finally {setPending(current=>current.filter(value=>value!==key))}
  }
  function save(job:Job) {
    if(!userId) {setLogin(true);return}
    if(!applicationWrites.ready) return
    void write(job.key,()=>applicationWrites.createConfirmed({userId,jobKey:job.key,listing:JSON.stringify(job),status:'Interested'}))
  }
  async function importPrevious() {
    if(!applicationWrites.ready||!userId||importing) return
    setImporting(true)
    setError('')
    try {
      for(const entry of new Map(importable.map(value=>[value.jobKey,value])).values()) {
        await applicationWrites.createConfirmed({...entry,userId})
      }
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Some saved roles could not be imported. Try again.')
    } finally {setImporting(false)}
  }
  function reset() {setQuery('');setLevels([]);setLocations([]);setSponsors([]);setClasses([]);setSelected([]);setMode('Any selected skill')}
  const current=isSignedIn?view:'Explore'
  return <div className="launchpad">
    <header className="topbar"><div className="top shell">
      <a className="brand" href="/" onClick={e=>{e.preventDefault();visit('Explore')}}><span><ArrowUpRight size={23}/></span>launchpad<b>.</b></a>
      <nav aria-label="Main">
        {views.map((item,i)=>{const Icon=[Compass,Bookmark,UserRound][i];return <button key={item} onClick={()=>visit(item)} aria-pressed={current===item}><Icon size={16}/>{item}{item==='My tracker'&&saved.length>0&&<span>{saved.length}</span>}</button>})}
      </nav>
      <button className="quiet auth" onClick={()=>isSignedIn?(setLogin(false),void signOut()):setLogin(true)}>{isSignedIn?'Sign out':'Sign in'}</button>
    </div></header>
    <main className="shell">
      {current==='Explore'&&<>
        <section className="hero"><div className="intro"><p className="eyebrow"><span/> THE EARLY CAREER BOARD</p><h1>Find your next <em>move.</em></h1><p>Discover internships and new-grad roles, see how your skills line up, and keep your applications in one place.</p>
          {!isSignedIn&&<button className="primary" onClick={()=>setLogin(true)}>Sign in to build your profile <ArrowUpRight size={16}/></button>}
        </div><div className="art" aria-hidden="true"><i/><i/><i/><span>✳</span><b>✦</b></div></section>
        <section aria-labelledby="explore-title"><div className="section-head"><div><h2 id="explore-title">Explore opportunities</h2><p>Browse sample listings or search the web for more roles. Confirm details with the employer.</p></div>{isSignedIn&&<button className="quiet" onClick={()=>visit('Profile')}>Edit my profile ↗</button>}</div>
          {isSignedIn&&<WebSearch onResults={setWeb}/>}
          <div className="filters">
            <label className="search"><Search size={18}/><input type="search" aria-label="Search displayed listings" placeholder="Search roles, employers, or locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>
            <Choices label="Experience level" options={levelOptions} values={levels} onChange={setLevels}/>
            <Choices label="Location / remote" options={locationOptions} values={locations} onChange={setLocations}/>
            <Choices label="Sponsorship" options={sponsorships} values={sponsors} onChange={setSponsors}/>
            <Choices label="College classification" options={[...years.slice(0,5),'None']} values={classes} onChange={setClasses}/>
            <Choices label="Skills" options={skills} values={selected} onChange={setSelected}/>
          </div>
          <div className="results"><span role="status">{shown.length} {shown.length===1?'opportunity':'opportunities'}</span><div>
            <Field label="Skill match" value={mode} options={['Any selected skill','All selected skills']} onChange={setMode}/>
            {active&&<button className="quiet" onClick={reset}>Clear filters</button>}
          </div></div>
          {error&&<p role="alert" className="error">{error}</p>}
          {shown.length?<div className="cards">{shown.map(job=>{
            const exists=saved.some(record=>record.data.jobKey===job.key)
            const busy=pending.includes(job.key)
            return <JobCard key={job.key} job={job} profile={profile} authenticated={isSignedIn}>
              <button className="save" aria-label={`${exists?'Saved':'Save'} ${job.title}`} disabled={busy||(isSignedIn&&!applicationWrites.ready)||exists} onClick={()=>save(job)}><Bookmark size={16} fill={exists?'currentColor':'none'}/>{busy?'Saving…':exists?'Saved':'Save'}</button>
            </JobCard>
          })}</div>:<div className="empty">No opportunities match these filters.</div>}
        </section>
      </>}
      {current==='Profile'&&<section className="inner"><div className="section-head"><div><h2>My profile</h2><p>Add preferences and skills to compare them with each listing.</p></div></div>
        {profiles.status==='ready'&&profileWrites.ready?<ProfileEditor key={userId} initial={profile} save={saveProfile}/>:<p role="status">{profiles.status==='error'?'Profile could not load. Try reloading.':'Loading your profile…'}</p>}
      </section>}
      {current==='My tracker'&&<section className="inner"><div className="section-head"><div><h2>My tracker</h2><p>Follow your applications from first interest through the final decision.</p></div><Choices label="Application status" options={statuses} values={stage} onChange={setStage}/></div>
        {error&&<p role="alert" className="error">{error}</p>}
        {applications.status==='ready'&&importable.length>0&&<div className="import-panel"><p>Import roles saved in this browser into this account.</p><button className="primary" disabled={importing||!applicationWrites.ready} onClick={()=>void importPrevious()}>{importing?'Importing…':'Import previous tracker'}</button></div>}
        {applications.status!=='ready'&&!saved.length?<p role="status">{applications.status==='error'?'Tracker could not load. Try reloading.':'Loading your tracker…'}</p>:null}
        {applications.status==='ready'&&!tracked.length&&<div className="empty">{stage.length?'No saved roles match the selected statuses.':'Save an opportunity from Explore to start tracking.'}</div>}
        <div className="cards tracker">{tracked.map(record=>{
          const job=readListing(record.data)
          const busy=pending.includes(record.recordId)||!applicationWrites.ready
          if(!job) return <article className="job-card" key={record.recordId}><p>This saved listing could not be displayed.</p><button className="quiet" disabled={busy} onClick={()=>void write(record.recordId,()=>applicationWrites.removeConfirmed(record.recordId))}>Remove saved listing</button></article>
          return <div className="tracked" key={record.recordId}><JobCard job={job} profile={profile} authenticated={isSignedIn}>
            <select aria-label={`Application status for ${job.title}`} value={record.data.status} disabled={busy} onChange={e=>{
              const status=e.target.value as Application['status']
              void write(record.recordId,()=>applicationWrites.putConfirmed(record.recordId,{status}))
            }}>{statuses.map(status=><option key={status}>{status}</option>)}</select>
          </JobCard>{record.data.legacyNote&&<p className="legacy-note">{record.data.legacyNote}</p>}<div className="tracker-actions"><button className="quiet" aria-expanded={calendar===record.recordId} onClick={()=>setCalendar(calendar===record.recordId?'':record.recordId)}>Calendar reminder</button>
            <button className="quiet" disabled={busy} aria-label={`Remove ${job.title}`} onClick={()=>{if(confirm(`Remove ${job.title} from your tracker?`))void write(record.recordId,()=>applicationWrites.removeConfirmed(record.recordId))}}>Remove</button></div>
            {calendar===record.recordId&&<CalendarReminder job={job}/>}</div>
        })}</div>
      </section>}
    </main>
    <footer><div className="shell"><b>launchpad.</b><span>Sample and web listings may change. Match summaries are advisory.</span></div></footer>
    {login&&!isSignedIn&&<AuthOverlay title="Sign in to Launchpad" description="Save your profile and track applications on any device." onClose={()=>setLogin(false)}/>}
  </div>
}
