import { describe, expect, it } from 'vitest'
import { buildJobSearch, matchesLocation, normalizeSearch, postingKey, searchPreferences, type SearchPreferences } from './job-search'

const preferences:SearchPreferences={skills:[],levels:[],locations:[],sponsorship:[],matchAll:false}
const baseUrl='https://jobs.ashbyhq.com/acme/a11ce'
function hit(url:string, title:string, text:string) { return {url,title,text} }

describe('job search',()=>{
  it('includes active filters and skill matching mode in a bounded Exa request',()=>{
    const body=buildJobSearch('developer', {...preferences,skills:['Python','C++'],levels:['New graduate'],
      locations:['Chicago','Remote'],sponsorship:['Available'],matchAll:true})
    expect(body.query).toContain('developer')
    expect(body.query).toContain('skills (all): Python, C++')
    expect(body.query).toContain('entry-level or new graduate')
    expect(body.query).toContain('Chicago or Remote')
    expect(body.query).toContain('explicitly offer work visa sponsorship')
    expect(body.numResults).toBeLessThanOrEqual(12)
  })

  it('uses profile defaults while preserving explicit browse filters',()=>{
    const profile={year:'Recent graduate',location:'Seattle',sponsorship:'Need sponsorship',skills:'["Python"]'}
    const defaults=searchPreferences(preferences,profile)
    expect(defaults).toMatchObject({profileYear:'Recent graduate',skills:['Python'],locations:['Seattle'],sponsorship:['Available']})
    expect(buildJobSearch('software developer',defaults).query).toContain('prefer entry-level or new graduate roles')
    const overrides=searchPreferences({...preferences,skills:['SQL'],levels:['Internship'],locations:['Remote'],sponsorship:['Unclear']},profile)
    expect(overrides).toMatchObject({skills:['SQL'],levels:['Internship'],locations:['Remote'],sponsorship:['Unclear']})
    expect(overrides.profileYear).toBeUndefined()
  })

  it('deduplicates tracked application URLs, removes editorial and foreign results, and keeps posting evidence',()=>{
    const title='Software Engineer Intern (Summer 2027) @ Acme'
    const text=`# ${title}\n- Location: Chicago, IL\n- Workplace: Hybrid\nYou will develop software in C++ and Python as part of our backend engineering team.`
    const jobs=normalizeSearch([
      hit(baseUrl+'/application?utm_source=board',title,text),
      hit(baseUrl,title,text),
      hit('https://acme.com/blog/tech-internships',title,text),
      hit('https://careers.acme.com/jobs/12','Top 10 software internships for 2027',text),
      hit('https://careers.acme.com/jobs/13',title,text.replace('Chicago, IL','Toronto, Canada')),
    ],'US software engineering internship summer 2027 Python',preferences)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({url:baseUrl,company:'Acme',location:'Chicago, IL · Hybrid',skills:['Python','C++'],sponsorship:'Not listed'})
    expect(jobs[0].summary).toContain('develop software')
    expect(matchesLocation(jobs[0].location,'Chicago')).toBe(true)
  })

  it('uses explicit sponsorship evidence and never treats silence as a restriction',()=>{
    const title='Software Developer, New Grad'
    const jobs=normalizeSearch([
      hit('https://company.com/jobs/one',title,'Location: Chicago\nH1B sponsorship is available for this position.'),
      hit('https://company.com/jobs/two',title,'Location: Boston\nWe are unable to provide visa sponsorship or transfer.'),
      hit('https://company.com/jobs/three',title,'Location: Seattle\nWork authorization requirements vary.'),
      hit('https://company.com/jobs/four',title,'Location: Austin\nUse JavaScript and SQL.'),
    ],'entry-level software developer roles',preferences)
    const sponsorshipSearch=normalizeSearch(jobs.map(job=>hit(job.url,job.title,job.description)),'entry-level software developer roles visa sponsorship',preferences)
    expect(sponsorshipSearch[0].sponsorship).toBe('Available')
    expect(sponsorshipSearch.some(job=>job.url.endsWith('/two'))).toBe(false)
    expect(jobs.find(job=>job.url.endsWith('/two'))?.sponsorshipNote).toContain('restriction')
    expect(jobs.find(job=>job.url.endsWith('/three'))?.sponsorship).toBe('Unclear')
    expect(jobs.find(job=>job.url.endsWith('/four'))?.sponsorship).toBe('Not listed')
  })

  it('keeps original posting identity across Greenhouse listings and embedded copies',()=>{
    expect(postingKey('https://job-boards.greenhouse.io/ixl/jobs/123?gh_src=board'))
      .toBe(postingKey('https://www.ixl.com/company/jobs?gh_jid=123&utm_campaign=search'))
  })
})
