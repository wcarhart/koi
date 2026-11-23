import {
  defaultArgument,
  defaultHelp,
  argumentScript,
  argumentHelp,
  argumentFieldErrors,
  argumentCollectionErrors,
  helpScript,
  helpErrors,
} from './builders';
export interface BuilderProfile {
  argumentKinds: { value: string; label: string }[];
  cardinalities: { value: string; label: string }[];
  defaultArgument: typeof defaultArgument;
  defaultHelp: typeof defaultHelp;
  argumentScript: typeof argumentScript;
  argumentHelp: typeof argumentHelp;
  argumentFieldErrors: typeof argumentFieldErrors;
  argumentCollectionErrors: typeof argumentCollectionErrors;
  helpScript: typeof helpScript;
  helpErrors: typeof helpErrors;
}
export type BuilderProfileId = 'v2-initial';
const profiles: Record<BuilderProfileId, BuilderProfile> = {
  'v2-initial': {
    argumentKinds: [
      { value: 'flag', label: 'Flag' },
      { value: 'option', label: 'Option' },
      { value: 'positional', label: 'Positional' },
    ],
    cardinalities: [
      { value: 'scalar', label: 'Scalar' },
      { value: 'array', label: 'Array' },
    ],
    defaultArgument,
    defaultHelp,
    argumentScript,
    argumentHelp,
    argumentFieldErrors,
    argumentCollectionErrors,
    helpScript,
    helpErrors,
  },
};
export function getBuilderProfile(
  id: string | undefined,
): BuilderProfile | undefined {
  return id && Object.hasOwn(profiles, id)
    ? profiles[id as BuilderProfileId]
    : undefined;
}
