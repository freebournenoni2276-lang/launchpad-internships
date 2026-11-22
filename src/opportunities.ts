import samples from './sample-jobs.json'

export const skills = ['Python','JavaScript','TypeScript','React','SQL','Java','C++','Go','Figma','Excel','Tableau','Machine Learning','Data Analysis','Project Management','Research','Design','Marketing','Communication','AWS','Kubernetes']
export const years = ['Freshman','Sophomore','Junior','Senior','Graduate student','Recent graduate']
export const sponsorships = ['Available','Not listed','Unclear'] as const
export const statuses = ['Interested','Applied','Interviewing','Closed'] as const
export type Job = {
  key:string; title:string; company:string; location:string; level:string; url:string;
  source:'Sample'|'Web search'; skills:string[]; classifications:string[];
  sponsorship: typeof sponsorships[number]; description:string; summary?:string; sponsorshipNote?:string
}
export type Profile = {year:string; location:string; sponsorship:string; skills:string}
export type Application = {jobKey:string; listing:string; status:typeof statuses[number]; legacyNote?:string}
export const sampleJobs = samples as Job[]
export const defaultProfile:Profile = {year:'Any',location:'Any',sponsorship:'Any',skills:'[]'}

export function safeUrl(raw:string) {
  try {
    const url=new URL(raw)
    return url.protocol==='https:' || url.protocol==='http:' ? url.href : ''
  } catch { return '' }
}

export function profileSkills(profile:Profile) {
  try {
    const values:unknown=JSON.parse(profile.skills)
    return Array.isArray(values) ? skills.filter(skill=>values.includes(skill)) : []
  } catch { return [] }
}

export function readListing(application:Application):Job|null {
  try {
    const job=JSON.parse(application.listing) as Job
    if (typeof job.title!=='string' || typeof job.company!=='string' ||
        typeof job.description!=='string' || typeof job.url!=='string' || (job.url && !safeUrl(job.url)) ||
        !Array.isArray(job.skills) || !Array.isArray(job.classifications)) return null
    return job
  } catch { return null }
}

export function readPreviousTracker():Application[] {
  try {
    const raw:unknown=JSON.parse(localStorage.getItem('launchpad-tracker-v1')||'{}')
    if (!raw || typeof raw!=='object') return []
    return Object.values(raw).flatMap(row=>{
      if (!row || typeof row.title!=='string' || typeof row.company!=='string') return []
      const link=typeof row.url==='string'?safeUrl(row.url):''
      const key=link.length<=700 && link?link:'previous:'+String(row.id||'').slice(0,100)
      if (key==='previous:') return []
      const job:Job={
        key,url:link,title:row.title.slice(0,170),company:row.company.slice(0,100),
        location:typeof row.location==='string'&&row.location?row.location.slice(0,120):'See posting',
        level:row.level==='Early career'?'New graduate':typeof row.level==='string'?row.level.slice(0,40):'',
        sponsorship:row.sponsorship==='Unspecified'?'Not listed':'Unclear',
        source:'Sample',skills:Array.isArray(row.skills)?skills.filter(skill=>row.skills.includes(skill)):[],
        classifications:Array.isArray(row.classifications)?years.filter(year=>row.classifications.includes(year)):[],
        description:'Saved in the previous Launchpad tracker.',
      }
      const status=statuses.find(value=>value===row.status)||(row.status==='Offer'?'Interviewing':'Interested')
      const legacyNote=[row.status==='Offer'?'Previous tracker status: Offer.':'',typeof row.notes==='string'?row.notes:''].filter(Boolean).join(' ').slice(0,2200)
      return [{jobKey:key,listing:JSON.stringify(job),status,...(legacyNote?{legacyNote}:{})}]
    })
  } catch { return [] }
}
