import { useMemo } from "react";

export const useSavingQuestions = (
  stateList: any[],
  voltageLevelList: any[],
  consumerCategoryList: any[],
  hvCategoryList: any[],
  answers: any,
) => {
  return useMemo(() => {
    const selectedState = stateList?.find((s) => s.state === answers.state);

    return [
      {
        key: "state",
        question: "Where is your facility located?",
        shortName: "State",
        type: "select" as const,
        required: true,
        options:
          stateList
            ?.filter((s) => s.discomList?.length > 0)
            ?.map((s) => ({
              label: s.displayName,
              value: s.state,
            })) || [],
      },
      {
        key: "provider",
        question: "Who's your electricity provider?",
        shortName: "Provider",
        type: "select" as const,
        required: true,
        options:
          selectedState?.discomList?.map((d: any) => ({
            label: `${d.displayName} (${d.discom})`,
            value: d.discom,
          })) || [],
        disabled: !answers.state,
      },
      {
        key: "consumerType",
        question: "What type of consumer are you?",
        shortName: "Consumer Type",
        type: "toggle" as const,
        required: true,
        options:
          consumerCategoryList?.map((c: string) => ({
            label: c.charAt(0).toUpperCase() + c.slice(1).toLowerCase(),
            value: c,
          })) || [],
      },
      {
        key: "category",
        question: "What category is your connection?",
        shortName: "Category",
        type: "select" as const,
        required: true,
        options:
          hvCategoryList?.map((v) => ({
            label: v.displayName?.replace("-", " ") || v.category.replace("_", " "),
            value: v.category,
          })) || [],
      },
      {
        key: "subCategory",
        question: "What sub-category is your connection?",
        shortName: "Sub Category",
        type: "select" as const,
        required: true,
        options:
          hvCategoryList
            ?.find((v) => v.category === answers.category)
            ?.subCategoryList?.map((sub: any) => ({
              label: sub.displayName,
              value: sub.subCategory,
            })) || [],
        disabled: !answers.category,
      },
      {
        key: "voltage",
        question: "What voltage level is your connection?",
        shortName: "Voltage Level",
        type: "select" as const,
        required: true,
        options:
          voltageLevelList?.map((v) => ({
            label: v.displayName?.split("_")?.reverse()?.join(" "),
            value: v.voltageLevel?.split("_")?.reverse()?.join("_"),
          })) || [],
      },
      {
        key: "load",
        question: "What is your sanctioned load?",
        shortName: "Sanctioned Load",
        type: "input" as const,
        required: true,
      },
      {
        key: "openAccess",
        question: "Are you currently using Open Access?",
        shortName: "Open Access",
        type: "toggle" as const,
        required: true,
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
      },
    ];
  }, [
    stateList,
    voltageLevelList,
    consumerCategoryList,
    hvCategoryList,
    answers.state,
    answers.category,
  ]);
};
