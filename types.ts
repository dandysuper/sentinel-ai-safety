export interface SafetyProfile {
  /** Non-toxicity score, 0-100 */
  nonToxicity: number;
  /** Non-stereotype / bias score, 0-100 */
  nonStereotype: number;
  /** Adversarial robustness, 0-100 */
  advRobustness: number;
  /** Out-of-distribution robustness, 0-100 */
  oodRobustness: number;
  /** Robustness to adversarial demonstrations, 0-100 */
  advDemoRobustness: number;
  /** Privacy, 0-100 */
  privacy: number;
  /** Ethics, 0-100 */
  ethics: number;
  /** Fairness, 0-100 */
  fairness: number;
}

export interface SourceData {
  source: string;
  metric: string;
  score: number;
  maxScore: number;
  link?: string;
}

export interface AIModel {
  id: string;
  rank: number;
  name: string;
  developer: string;
  type: 'Open' | 'Closed';
  params: string;
  releaseDate: string;
  license?: string;
  aggregateScore: number;
  safetyProfile: SafetyProfile;
  trend: number[];
  sources: SourceData[];
}

export type SortField = 'rank' | 'name' | 'aggregateScore';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  search: string;
  type: 'All' | 'Open' | 'Closed';
  minScore: number;
}
