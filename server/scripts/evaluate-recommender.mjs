{
  "cases": 0,
  "roleMatchAccuracy": 0,
  "baseline": {
    "precisionAt10": 0,
    "skillCoverageAt10": 0,
    "recommendationDiversity": 0
  },
  "enhanced": {
    "precisionAt10": 0,
    "skillCoverageAt10": 0,
    "recommendationDiversity": 0
  },
  "improvement": {
    "precisionAt10": {
      "absolutePoints": 0,
      "relativePercent": 0
    },
    "skillCoverageAt10": {
      "absolutePoints": 0,
      "relativePercent": 0
    },
    "recommendationDiversity": {
      "absolutePoints": 0,
      "relativePercent": 0
    }
  },
  "prerequisiteViolationRate": 0,
  "methodology": {
    "baseline": "Gap-match + role-fit ranking",
    "enhanced": "Hybrid TF-IDF + dense embedding similarity + skill-gap matching + prerequisite-aware ranking + learner-preference model + MMR-style diversity",
    "precision": "Fraction of top-10 recommendations that directly address an identified target-role skill gap",
    "skillCoverage": "Fraction of identified target-role skill gaps represented by the top-10 recommendations",
    "diversity": "Normalized unique-skill representation across the top-10 recommendations",
    "prerequisiteSafety": "Recommendations are ordered through the prerequisite-aware path planner before violation measurement",
    "evaluationScope": "One simulated learner profile per target role using approximately 30% of the role skills as already-known skills"
  }
}
