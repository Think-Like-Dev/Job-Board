import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileTextIcon } from "lucide-react";

import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";

/**
 * Placeholder for the applications received for one job. The real table,
 * filters and candidate drawers land with the applications module.
 */
const Applications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t("job.applications.title")}</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/jobs")}
        >
          {t("job.applications.back")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted">
            <FileTextIcon className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-medium">
              {t("job.applications.comingSoonTitle")}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("job.applications.comingSoon")}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Applications;
