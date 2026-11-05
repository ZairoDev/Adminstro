export const FEATURED_PUBLIC_FIELDS = [
  "name",
  "position",
  "department",
  "description",
] as const;

export type FeaturedPublicField = (typeof FEATURED_PUBLIC_FIELDS)[number];

export type FeaturedProfileValues = Record<FeaturedPublicField, string>;

export type FeaturedProfileSource = {
  name?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  description?: string | null;
};

export function toFeaturedProfileValues(
  source: FeaturedProfileSource,
): FeaturedProfileValues {
  return {
    name: source.name?.trim() ?? "",
    position: source.jobTitle?.trim() ?? "",
    department: source.department?.trim() ?? "",
    description: source.description?.trim() ?? "",
  };
}

export function missingFeaturedFields(
  source: FeaturedProfileSource,
): FeaturedPublicField[] {
  const values = toFeaturedProfileValues(source);
  return FEATURED_PUBLIC_FIELDS.filter((field) => values[field].length === 0);
}
