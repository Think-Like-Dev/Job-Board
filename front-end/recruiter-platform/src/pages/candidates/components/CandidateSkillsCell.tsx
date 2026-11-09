import { Badge } from "@ui/badge";

import type { CandidateListItem } from "@/api/schemas/candidates.schema";

const MAX_VISIBLE_SKILLS = 3;

/** First few skills as badges, with an overflow count. */
export function CandidateSkillsCell({
  skills,
}: {
  skills: CandidateListItem["skills"];
}) {
  if (!skills.length) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const visible = skills.slice(0, MAX_VISIBLE_SKILLS);
  const overflow = skills.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((skill) => (
        <Badge key={skill.id} variant="secondary">
          {skill.name}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge
          variant="outline"
          title={skills.map((skill) => skill.name).join(", ")}
        >
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}
