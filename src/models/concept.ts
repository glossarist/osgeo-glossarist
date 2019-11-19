import { IndexableObject } from 'sse/storage/query';


// export interface Concept extends IndexableObject {
//   id: number,
//   term: string,
// }


export interface LocalizedConcept extends IndexableObject {
  language_code: string,

  id: number,
  term: string,
  definition: string,

  comments: string[],
  examples: string[],
  notes: string[],

  authoritative_source: { link: URL },
}


export interface Concept extends IndexableObject {
  id: number,
  term: string,
  eng: LocalizedConcept,
}
