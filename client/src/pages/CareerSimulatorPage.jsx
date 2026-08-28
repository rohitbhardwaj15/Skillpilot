import { useState } from 'react';
import { api } from '../lib/api';

export default function CareerSimulatorPage() {
  const [targetRole, setTargetRole] =
    useState('');

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const handleSimulate = async (e) => {
    e.preventDefault();

    if (!targetRole.trim()) {
      setError(
        'Please enter a target career role.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response =
        await api.simulateCareerPath({
          targetRole:
            targetRole.trim(),
        });

      setResult(
        response?.data ||
          response
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Unable to simulate career path.'
      );
    } finally {
      setLoading(false);
    }
  };

  const readiness =
    result?.readiness ??
    result?.readinessScore ??
    0;

  const skillGaps =
    result?.skillGaps ||
    result?.gaps ||
    [];

  const roadmap =
    result?.roadmap ||
    result?.learningPath ||
    [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            What-If Career Simulator
          </h1>

          <p className="mt-2 text-muted-foreground">
            Explore how your current skills
            translate to a different career
            and discover the learning path
            needed to get there.
          </p>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSimulate}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <label className="mb-2 block text-sm font-medium">
            Target Career
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={targetRole}
              onChange={(e) =>
                setTargetRole(
                  e.target.value
                )
              }
              placeholder="e.g. AI Engineer"
              className="flex-1 rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-6 py-3 font-medium disabled:opacity-50"
            >
              {loading
                ? 'Simulating...'
                : 'Simulate Career'}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-500">
              {error}
            </p>
          )}
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6">

            {/* Readiness */}
            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-xl border bg-card p-6">
                <p className="text-sm text-muted-foreground">
                  Current Role
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {result.currentRole ||
                    'Current Profile'}
                </h2>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <p className="text-sm text-muted-foreground">
                  Target Role
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {result.targetRole ||
                    targetRole}
                </h2>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <p className="text-sm text-muted-foreground">
                  Career Readiness
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {Math.round(
                    readiness <= 1
                      ? readiness * 100
                      : readiness
                  )}
                  %
                </h2>
              </div>
            </div>

            {/* Skill Gap */}
            <section className="rounded-xl border bg-card p-6">
              <h2 className="text-xl font-semibold">
                Skill Gap Analysis
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Skills you need to develop
                for the target role.
              </p>

              {skillGaps.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {skillGaps.map(
                    (gap, index) => {
                      const skill =
                        typeof gap ===
                        'string'
                          ? gap
                          : gap.skill ||
                            gap.name;

                      const priority =
                        typeof gap ===
                        'object'
                          ? gap.priority
                          : null;

                      return (
                        <div
                          key={`${skill}-${index}`}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {skill}
                            </span>

                            {priority && (
                              <span className="text-xs text-muted-foreground">
                                {priority}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No major skill gaps detected.
                </p>
              )}
            </section>

            {/* Roadmap */}
            <section className="rounded-xl border bg-card p-6">
              <h2 className="text-xl font-semibold">
                Simulated Learning Roadmap
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Recommended sequence based on
                your current knowledge and
                target-role requirements.
              </p>

              <div className="mt-6 space-y-4">
                {roadmap.length ? (
                  roadmap.map(
                    (item, index) => {
                      const title =
                        typeof item ===
                        'string'
                          ? item
                          : item.title ||
                            item.course?.title ||
                            `Step ${
                              index + 1
                            }`;

                      const description =
                        typeof item ===
                        'object'
                          ? item.description ||
                            item.course?.description
                          : null;

                      return (
                        <div
                          key={index}
                          className="flex gap-4 rounded-lg border p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-semibold">
                            {index + 1}
                          </div>

                          <div>
                            <h3 className="font-semibold">
                              {title}
                            </h3>

                            {description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No roadmap generated.
                  </p>
                )}
              </div>
            </section>

            {/* Summary */}
            {result.summary && (
              <section className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold">
                  Simulation Summary
                </h2>

                <p className="mt-3 text-muted-foreground">
                  {result.summary}
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
