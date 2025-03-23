import { z } from 'zod';
import { ElectionType } from '../../models/types';

// Schema for a candidate's policy
export const PolicySchema = z.object({
  title: z.string(),
  description: z.string(),
});

// Schema for a candidate
export const CandidateSchema = z.object({
  imageUrl: z.string().url().optional(),
  fullName: z.string(),
  currentPosition: z.string(),
  linkedinUrl: z.string().url().optional(),
  campaignUrl: z.string().url().optional(),
  description: z.string(),
  keyPolicies: z.array(PolicySchema),
  additionalNotes: z.string().optional(),
  sources: z.array(z.string()),
  party: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  twitter: z.string().optional(),
});

// Enum for election types
export const ElectionTypeSchema = z.enum([
  ElectionType.LOCAL,
  ElectionType.STATE,
  ElectionType.NATIONAL,
  ElectionType.UNIVERSITY,
]);

// Schema for a detailed election
export const DetailedElectionSchema = z.object({
  position: z.string(),
  date: z.date(),
  city: z.string(),
  state: z.string(),
  description: z.string(),
  type: ElectionTypeSchema,
  candidates: z.array(CandidateSchema),
});

// Schema for the transformed data
export const TransformedDataSchema = z.object({
  elections: z.array(DetailedElectionSchema),
});

// Type definitions derived from schemas
export type Policy = z.infer<typeof PolicySchema>;
export type ValidatedCandidate = z.infer<typeof CandidateSchema>;
export type ValidatedElection = z.infer<typeof DetailedElectionSchema>;
export type ValidatedTransformedData = z.infer<typeof TransformedDataSchema>; 