export enum ElectionType {
  LOCAL = 'LOCAL',
  STATE = 'STATE',
  NATIONAL = 'NATIONAL',
  UNIVERSITY = 'UNIVERSITY'
}

export interface BasicElection {
  name: string;
  state: string;
  district: string;
  description: string;
  date: Date;
}

export interface DetailedPosition {
  positionName: string;
  electionDate: Date;
  city: string;
  state: string;
  description: string;
  type: ElectionType;
  positions: number;
}

export interface CandidatePolicy {
  title: string;
  description: string;
}

export interface Candidate {
  fullName: string;
  currentPosition: string;
  imageUrl?: string;
  linkedinUrl?: string;
  campaignUrl?: string;
  description: string;
  keyPolicies: CandidatePolicy[];
  additionalNotes?: string;
  sources: string[];
  party?: string;
  city?: string;
  state?: string;
  twitter?: string;
}

export interface DetailedElection {
  position: string;
  date: Date;
  city: string;
  state: string;
  description: string;
  type: ElectionType;
  candidates: Candidate[];
}

export interface TransformedData {
  elections: DetailedElection[];
} 