export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "environment"
  | "documentation"
  | "package"
  | "github"
  | "secret"
  | "docker"
  | "community"
  | "ci"
  | "metadata"
  | "code"
  | "dependencies";

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  file?: string;
  line?: number;
  evidence?: string;
  fix: string;
  fixPrompt?: string;
}

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string | null;
  stars?: number;
  forks?: number;
  openIssues?: number;
  isPrivate: boolean;
  htmlUrl: string;
  topics?: string[];
  archived?: boolean;
  isTemplate?: boolean;
  language?: string | null;
  sizeKb?: number;
  pushedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  licenseSpdxId?: string | null;
  licenseName?: string | null;
}

export interface RepoData {
  metadata: RepoMetadata;
  files: RepoFile[];
  fileTree: string[];
  workflows: string[];
  hasDependabot: boolean;
  hasWorkflows: boolean;
  hasIssueTemplate: boolean;
  hasCodeowners: boolean;
  hasPullRequestTemplate: boolean;
  hasDockerfile: boolean;
  hasDockerignore: boolean;
  hasChangelog: boolean;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  primaryLockfile: string | null;
  extraLockfiles: string[];
}

export type CheckStatus = "pass" | "fail" | "warn" | "missing" | "info" | "skip";

export interface CheckResult {
  id: string;
  category: FindingCategory;
  title: string;
  status: CheckStatus;
  message: string;
  file?: string;
  line?: number;
}

export interface CategoryBreakdown {
  total: number;
  passed: number;
  failed: number;
}

export interface ScanSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  totalFindings: number;
  filesChecked: number;
  filesMissing: string[];
  byCategory: Record<FindingCategory, CategoryBreakdown>;
  checks: CheckResult[];
}

export interface FileGroup {
  path: string;
  findings: Finding[];
  counts: Record<Severity, number>;
}

export interface ScanReport {
  repo: RepoMetadata;
  score: number;
  scoreBand: ScoreBand;
  summary: ScanSummary;
  findings: Finding[];
  filesChecked: string[];
  fileGroups: FileGroup[];
  scannedAt: string;
  durationMs: number;
}

export type ScoreBand = "excellent" | "good" | "fair" | "weak" | "critical";

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  url: string;
}
