import { profileSkills, safeUrl, skills, years, type Job, type Profile } from './opportunities'

export type SearchPreferences = {
  skills: string[]
  matchAll: boolean
  levels: string[]
  locations: string[]
  sponsorship: string[]
  profileYear?: string
}

export function searchPreferences(filters: SearchPreferences, profile: Profile): SearchPreferences {
  return {
    ...filters,
    skills: filters.skills.length ? filters.skills : profileSkills(profile),
    locations: filters.locations.length ? filters.locations : profile.location !== 'Any' && profile.location.trim() ? [profile.location.trim()] : [],
    sponsorship: filters.sponsorship.length ? filters.sponsorship : profile.sponsorship === 'Need sponsorship' ? ['Available'] : [],
    profileYear: !filters.levels.length && years.includes(profile.year) ? profile.year : undefined,
  }
}

export function buildJobSearch(terms: string, preferences: SearchPreferences) {
  const sponsorshipRequested = preferences.sponsorship.includes('Available') || /\b(?:visa sponsorship|h-?1b)\b/i.test(terms)
  const level = preferences.levels.map(value => value === 'New graduate' ? 'entry-level or new graduate' : value)
  const clauses = [
    'Official employer job posting with application link',
    terms.trim() || 'early-career opportunity',
    level.length ? 'level: ' + level.join(' or ') :
      preferences.profileYear === 'Recent graduate' ? 'prefer entry-level or new graduate roles' :
      preferences.profileYear ? `prefer internships suitable for ${preferences.profileYear.toLowerCase()} students` :
      !terms.trim() ? 'internship or entry-level' : '',
    preferences.skills.length ? `skills (${preferences.matchAll ? 'all' : 'any'}): ${preferences.skills.join(', ')}` : '',
    preferences.locations.length ? 'job location: ' + preferences.locations.join(' or ') : '',
    sponsorshipRequested ? 'prefer postings that explicitly offer work visa sponsorship' :
      preferences.sponsorship.length ? 'sponsorship details may be unspecified' : '',
  ]
  return {
    query: clauses.filter(Boolean).join(': ').slice(0, 900),
    numResults: 12,
    type: 'auto',
    contents: { text: { maxCharacters: 4500, includeHtmlTags: false } },
  }
}

export type SearchHit = { title?: unknown; url?: unknown; text?: unknown }

const ats = ['ashbyhq.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'smartrecruiters.com']
const unofficial = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'visajobs.xyz',
  'correctrecruitment.com', 'simplify.jobs', 'jobright.ai', 'monster.com', 'handshake.com', 'jobleads.com', 'jobglance.app']
const hostIs = (host: string, domain: string) => host === domain || host.endsWith('.' + domain)
const clean = (text: string) => text.replace(/\*\*|__|^\s*[-•#]+\s*/g, '').trim()
const trackedKeys = /^(utm_.+|gh_src|source|ref|referrer|fbclid|gclid|embed)$/i

function postingUrl(raw: string) {
  const href = safeUrl(raw)
  if (!href || href.length > 700) return null
  const url = new URL(href)
  if (url.username || url.password) return null
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) if (trackedKeys.test(key)) url.searchParams.delete(key)
  if (hostIs(url.hostname, 'ashbyhq.com')) url.pathname = url.pathname.replace(/\/application\/?$/, '')
  url.pathname = url.pathname.replace(/\/$/, '') || '/'
  url.searchParams.sort()
  return url
}

export function postingKey(raw: string) {
  const url = postingUrl(raw)
  if (!url) return raw
  const greenhouseId = url.searchParams.get('gh_jid') ||
    (hostIs(url.hostname, 'greenhouse.io') ? url.pathname.match(/\/jobs\/(\d+)(?:\/|$)/)?.[1] : '')
  if (greenhouseId && /^\d+$/.test(greenhouseId)) return 'greenhouse:' + greenhouseId
  return url.hostname.replace(/^www\./, '') + url.pathname + url.search
}

const us = /\b(?:United States(?: of America)?|U\.?S\.?A\.?(?!\w)|U\.S\.(?!\w)|US(?=\s|$|[-–,;/])|California|Massachusetts|New York|Seattle|San Francisco|San Mateo|Menlo Park|Palo Alto|Chicago|Austin|Boston|Texas|Virginia|Michigan|Georgia|Washington(?: State|, DC)|(?:,\s*(?:CA|MA|NY|WA|TX|IL|VA|MI|FL|GA|CO|OH|AZ|UT|NC|NJ|PA|MN|MD|OR|DC)\b))\b/
const otherRegions = [
  /\b(?:Canada|Toronto|Vancouver|Ottawa|Montreal|Calgary)\b/i,
  /\b(?:United Kingdom|UK|London|England|Scotland|Manchester|Edinburgh)\b/i,
  /\b(?:Germany|Berlin|Munich|France|Paris|Netherlands|Amsterdam|Ireland|Dublin|Spain|Barcelona|Portugal|Lisbon|Poland|Warsaw|Switzerland|Zurich)\b/i,
  /\b(?:India|Bengaluru|Bangalore|Hyderabad|Mumbai|Pakistan|Punjab|Singapore|Japan|Tokyo|China|Hong Kong|Australia|Sydney|Melbourne|New Zealand|Mexico|Brazil|Philippines)\b/i,
]
const regions = [us,...otherRegions]
const regionMatches = (location: string) => regions.filter(region => region.test(location))
const locationBase = (value: string) => value.toLowerCase().replace(/\b(?:on[- ]?site|in[- ]office|hybrid|remote)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const city = (value: string) => locationBase(value.split(/[·,;]/)[0])

export function matchesLocation(jobLocation: string, wanted: string) {
  if (jobLocation === wanted) return true
  if (/^remote$/i.test(wanted)) return /\bremote\b/i.test(jobLocation)
  if (/^(?:US|USA|U\.S\.|United States)$/i.test(wanted)) return us.test(jobLocation)
  const preferred = city(wanted).replace(/^us [a-z]{2} /,'')
  return Boolean(preferred && jobLocation.split(/[;|]/).some(value =>
    (' ' + locationBase(value) + ' ').includes(' ' + preferred + ' ')
  ))
}

function locationFrom(lines: string[], title: string) {
  const facts = lines.slice(0, 34)
  const listed = facts.flatMap((line, index) => {
    const fact = line.match(/^(?:other |job )?locations?\s*[:–-]\s*(.+)$/i)?.[1]
    if (fact) return [fact]
    if (/^locations?\s*:?$/i.test(line)) {
      return facts.slice(index+1, index+4).filter(value => value.length < 95 &&
        (us.test(value) || otherRegions.some(region => region.test(value))))
    }
    return []
  }).filter(value => value.length < 170)
  const afterTitle = lines.slice(lines.indexOf(title)+1, lines.indexOf(title)+6)
  const nearby = afterTitle.find(line => line.length < 175 && /,|\|/.test(line) &&
    (us.test(line) || otherRegions.some(region => region.test(line))) &&
    !/\b(?:we|our|apply|company|career development)\b/i.test(line))
  const workplace = facts.find(line => /^workplace\s*:/i.test(line))?.split(':')[1]?.trim()
  const location = [...new Set(listed.length ? listed : nearby ? [nearby.replace(/^interns?\s*\|\s*/i, '')] : [])].join('; ')
  return [location, workplace && !location.toLowerCase().includes(workplace.toLowerCase())
    ? workplace.replace(/^onsite$/i, 'On-site') : ''].filter(Boolean).join(' · ').slice(0, 160) || 'See posting'
}

const juniorRole = /\b(?:new grad(?:uate)?s?|college grad(?:uate)?|early careers?|entry[- ]level|graduate (?:program(?:me)?|software|engineer|developer|analyst)|(?:software (?:engineer|developer)|engineer|developer) graduate|(?:junior|jr\.?)\s+(?:software|web|back[- ]?end|front[- ]?end|developer|engineer)|no experience needed)\b/i
const internRole = /\b(?:intern|internship|co[- ]op)\b/i
const editorial = /\b(?:roundup|job board|job listings|salary guide|interview guide|resume tips|how to (?:get|land|find|apply)|top \d+|jobs with (?:visa|sponsorship)|visa[- ]sponsored jobs|best (?:jobs|internships)|open roles|all openings)\b/i
const role = /\b(?:engineer(?:ing)?|developer|analyst|designer?|research(?:er)?|product|marketing|data|software|finance|sales|operations|intern(?:ship)?|associate|graduate)\b/i

function classifySponsorship(text: string): Pick<Job, 'sponsorship' | 'sponsorshipNote'> {
  const negative = /\b(?:cannot|can(?:not|[’']t)|will not|do(?:es)? not|unable to)\s+(?:(?:provide|offer|support)\s+)?(?:[\w-]+\s+){0,3}sponsor(?:ship)?\b|\b(?:visa|work|immigration|employment|h-?1b) sponsorship (?:is )?(?:not available|not offered|unavailable)|\bnot (?:eligible|available) for (?:any )?(?:(?:work|visa|employment) )?sponsorship|\b(?:without|no) (?:visa |work |employment )?sponsorship\b/i
  const positive = /\b(?:visa|work|employment|immigration|h-?1b) sponsorship (?:is available|is offered|will be provided)\b|\bsponsorship is (?:available|offered) for this (?:role|position)\b|\b(?:we|the company) (?:can|will| do) (?:provide|offer) (?:visa|work|employment|h-?1b) sponsorship\b/i
  if (negative.test(text)) return { sponsorship: 'Unclear', sponsorshipNote: 'The posting states a sponsorship restriction. Check its exact terms.' }
  if (positive.test(text)) return { sponsorship: 'Available' }
  if (/\b(?:sponsor(?:ship)?|h-?1b|work authorization|right to work)\b/i.test(text))
    return { sponsorship: 'Unclear', sponsorshipNote: 'The excerpt mentions sponsorship or work authorization. Confirm eligibility with the employer.' }
  return { sponsorship: 'Not listed' }
}

function summarize(lines: string[], title: string, mentioned: string[]) {
  const usable = (line: string) => line !== title && line.length >= 45 &&
    !/\b(?:privacy|equal opportunity|accommodation|cookie|apply for|all qualified applicants|sponsor(?:ship)?)\b/i.test(line)
  const detail = lines.find(line => usable(line) &&
    /\b(?:you(?:['’]ll| will) (?:help |be |work |build |design |develop |contribute |learn |create |join |take |ship |improve )|the (?:intern|role) will|[Aa]s (?:a|an) [\w /-]{1,55}(?:intern|engineer|developer)|responsible for)\b/i.test(line)) ||
    lines.find(line => usable(line) && /^(?:design|develop|build|contribute|experience|proficien(?:t|cy)|strong proficiency)\b/i.test(line))
  if (detail) {
    const sentence = detail.match(/^.{45,225}?[.!?](?=\s|$)/)?.[0]
    return sentence || (detail.length > 225 ? detail.slice(0, 222).replace(/\s+\S*$/, '') + '…' : detail)
  }
  return mentioned.length ? 'Skills mentioned in the posting include ' + mentioned.slice(0,4).join(', ') + '.' : 'See the employer’s posting for responsibilities and qualifications.'
}

function mentionsSkill(text: string, skill: string) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flags = ['Go','Java'].includes(skill) ? '' : 'i'
  const term = skill === 'Go' ? '(?:Go|Golang)' : escaped
  return new RegExp('(?:^|[^a-z0-9+])' + term + '(?=$|[^a-z0-9+])', flags).test(text)
}

export function normalizeSearch(hits: SearchHit[], terms: string, preferences: SearchPreferences): Job[] {
  const candidates: { job: Job; score: number; identity: string; roleIdentity: string }[] = []
  const requested = preferences.skills.length ? preferences.skills : skills.filter(value => mentionsSkill(terms, value))
  const preferredRegions = preferences.locations.length
    ? preferences.locations.flatMap(regionMatches)
    : regionMatches(terms)
  const wantsSponsorship = preferences.sponsorship.includes('Available') || /\b(?:visa sponsorship|h-?1b)\b/i.test(terms)
  const requestedYear = terms.match(/\b20\d{2}\b/)?.[0]

  for (const hit of hits) {
    if (typeof hit.url !== 'string' || typeof hit.title !== 'string') continue
    const url = postingUrl(hit.url)
    if (!url || unofficial.some(host => hostIs(url.hostname, host)) ||
      /\/(?:blog|articles?|news|guides?|resources|roundups?|editorial)(?:\/|$)/i.test(url.pathname) ||
      /\.edu$/.test(url.hostname) || editorial.test(hit.title)) continue
    const description = typeof hit.text === 'string' ? hit.text.slice(0, 4500) : ''
    if (/^By [^\n]{1,45} \/ [A-Z][a-z]+ \d{1,2}, 20\d{2}\s*$/m.test(description.slice(0,500))) continue
    const lines = description.split('\n').map(clean).filter(Boolean)
    const heading = description.match(/^#\s+([^\n]+)/m)?.[1]?.trim()
    const rawTitle = (heading && role.test(heading) ? heading : hit.title).replace(/^Job Application for\s+/i, '').trim()
    const split = rawTitle.match(/^(.+?)\s+(?:@|at)\s+([^|]+)$/i)
    const title = (split?.[1] || rawTitle.split(/\s+\|\s+/)[0]).slice(0,170)
    if (!role.test(title) || editorial.test(title)) continue
    const level = internRole.test(title) ? 'Internship' :
      juniorRole.test(title) || /\b(?:job type[^\n]{0,70}entry level|early career \| full time|0[–-]2 years of (?:professional |software[- ]engineering )?experience)\b/i.test(description)
        ? 'New graduate' : ''
    if (!level || (preferences.levels.length && !preferences.levels.includes(level))) continue
    if (requestedYear && /\bsummer\b/i.test(terms) && !title.includes(requestedYear) && /\b20\d{2}\b/.test(title)) continue
    if (/\b(?:position|job|posting) (?:has been filled|is no longer available)|\bno longer accepting applications\b/i.test(description)) continue
    const knownATS = ats.some(domain => hostIs(url.hostname, domain))
    const detailPath = /\/(?:jobdetails?|job|jobs|careers|positions?|vacancies)\/[^/]+/i.test(url.pathname)
    const applicationSignal = /\b(?:apply (?:now|for this (?:job|position|role))|job application for|job description|requisition (?:id|number))\b/i.test(description)
    if (!knownATS && !detailPath && !applicationSignal && !url.searchParams.has('gh_jid')) continue
    if (knownATS && url.pathname.split('/').filter(Boolean).length < 2 && !url.searchParams.has('gh_jid')) continue

    const location = locationFrom(lines, heading ? clean(heading) : title)
    const observedRegions = regionMatches(location)
    const regionMatch = preferredRegions.some(region => observedRegions.includes(region))
    if (preferredRegions.length && observedRegions.length && !regionMatch) continue
    const locationMatch = preferences.locations.some(value => matchesLocation(location, value))
    // Skip explicit mismatches, while retaining roles whose excerpt has no usable location.
    if (preferences.locations.length && !locationMatch && location !== 'See posting') continue
    const employer = lines.find(line => /^company\s*:/i.test(line))?.replace(/^company\s*:\s*/i, '')
      || split?.[2].trim() || hit.title.match(/\s(?:@|at)\s+([^|]+)$/i)?.[1]?.trim()
      || hit.title.match(/\|\s*([^|]+?)\s+Careers\s*$/i)?.[1]?.trim() || url.hostname.replace(/^www\./, '')
    const mentioned = skills.filter(skill => mentionsSkill(description, skill))
    const classifications = years.filter(year => {
      if (year === 'Junior' || year === 'Senior') return new RegExp(`\\b(?:rising ${year}|${year} (?:year|students?))\\b`, 'i').test(description)
      return year !== 'Recent graduate' && new RegExp('\\b' + year + 's?\\b', 'i').test(description)
    })
    const sponsorship = classifySponsorship(description)
    if (wantsSponsorship && sponsorship.sponsorshipNote?.includes('restriction')) continue
    const hitsOnSkills = requested.filter(value => mentioned.includes(value)).length
    const fitsProfile = preferences.profileYear === 'Recent graduate' ? level === 'New graduate' :
      Boolean(preferences.profileYear && (classifications.includes(preferences.profileYear) || level === 'Internship'))
    const score = (fitsProfile ? 2 : 0) + (knownATS ? 2 : 0) + (locationMatch || regionMatch ? 3 : 0) +
      (requestedYear && title.includes(requestedYear) ? 3 : 0) + hitsOnSkills * 2 +
      (preferences.matchAll && requested.length && hitsOnSkills === requested.length ? 4 : 0) +
      (wantsSponsorship ? sponsorship.sponsorship === 'Available' ? 8 : 0 : 0)
    const job: Job = { key:url.href, url:url.href, title, company:employer.slice(0,100), location, level, source:'Web search',
      ...sponsorship, description, summary:summarize(lines,title,mentioned), skills:mentioned, classifications }
    candidates.push({job,score,identity:postingKey(url.href),
      roleIdentity:[employer,title,location].map(value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()).join('|')})
  }
  const urls = new Set<string>(), roles = new Set<string>()
  const jobs: Job[] = []
  for (const candidate of candidates.sort((a,b) => b.score - a.score)) {
    if (urls.has(candidate.identity) || roles.has(candidate.roleIdentity)) continue
    urls.add(candidate.identity)
    roles.add(candidate.roleIdentity)
    jobs.push(candidate.job)
    if (jobs.length === 6) break
  }
  return jobs
}
