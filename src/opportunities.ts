import samples from './sample-jobs.json'

export const skills = ['Python','JavaScript','TypeScript','React','SQL','Java','C++','Go','Figma','Excel','Tableau','Machine Learning','Data Analysis','Project Management','Research','Design','Marketing','Communication','AWS','Kubernetes']
export const years = ['Freshman','Sophomore','Junior','Senior','Graduate student','Recent graduate']
export const sponsorships = ['Available','Not listed','Unclear'] as const
export const statuses = ['Interested','Applied','Interviewing','Closed'] as const
export type Job = {
  key:string; title:string; company:string; location:string; level:string; url:string;
  source:'Sample'|'Web search'; skills:string[]; classifications:string[];
  sponsorship: typeof sponsorships[number]; description:string; sponsorshipNote?:string
}
export type Profile = {year:string; location:string; sponsorship:string; skills:string}
export type Application = {jobKey:string; listing:string; status:typeof statuses[number]}
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
        typeof job.description!=='string' || !safeUrl(job.url) ||
        !Array.isArray(job.skills) || !Array.isArray(job.classifications)) return null
    return job
  } catch { return null }
}

export type SearchHit = {title?:string; url?:string; text?:unknown}
export function normalizeSearch(hits:SearchHit[]):Job[] {
  const jobs=new Map<string,Job>()
  for (const hit of hits) {
    if (typeof hit.url!=='string' || typeof hit.title!=='string') continue
    const address=safeUrl(hit.url)
    if (!address || address.length>700) continue
    const url=new URL(address)
    url.hash=''
    const key=url.href
    const description=typeof hit.text==='string' ? hit.text.slice(0,2400) : ''
    const heading=description.match(/^#\s+([^\n]+)/m)?.[1]
    const title=heading && /intern|new grad|early career|entry.level/i.test(heading) ? heading : hit.title
    const level=/\binterns?(?:ship)?\b/i.test(title) ? 'Internship' : /new grad|early career|entry.level|graduate program/i.test(title) ? 'New graduate' : ''
    if (!level) continue
    const excerpt=description.slice(0,1100)
    const location=excerpt.split('\n').map(value=>value.trim()).slice(0,20).find(value=>value.length<=110 && /^(?:[-–• ]*)?(?:locations?\s*[:–-]|remote\b|hybrid\b|on[- ]site\b)/i.test(value))?.replace(/^[-–• ]*locations?\s*[:–-]\s*/i,'') || 'See posting'
    const restrictive=/\b(?:cannot|can not|will not|do not|does not|unable to) (?:provide |offer )?(?:visa )?sponsor|\b(?:without|no) (?:visa |employment )?sponsorship/i.test(description)
    const available=/\b(?:visa|employment) sponsorship (?:is available|is offered)|\bwe (?:can|will) (?:provide|offer) (?:visa|employment) sponsorship/i.test(description)
    const sponsorship=restrictive?'Unclear':available?'Available':/\bsponsor(?:ship)?\b/i.test(description)?'Unclear':'Not listed'
    const text=description.toLowerCase()
    const mentioned=skills.filter(skill=>{
      const escaped=skill.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
      return new RegExp('(?:^|[^a-z0-9+])'+escaped+'(?:$|[^a-z0-9+])',skill==='Go'?'':'i').test(skill==='Go'?description:text)
    })
    const classifications=years.filter(year=>{
      if (year==='Junior'||year==='Senior') return new RegExp('(?:rising '+year+'|'+year+' (?:year|students?))','i').test(description)
      return year!=='Recent graduate' && description.toLowerCase().includes(year.toLowerCase()) && (year!=='Graduate student'||/\bgraduate students?\b/i.test(description))
    })
    jobs.set(key,{key,url:key,title:title.slice(0,170),company:url.hostname.replace(/^www\./,''),location,level,source:'Web search',
      sponsorship, sponsorshipNote:restrictive?'The excerpt indicates a possible sponsorship restriction. Check the employer’s wording.':undefined,
      description,skills:mentioned,classifications})
  }
  return [...jobs.values()]
}
