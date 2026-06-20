export const GRADES = ["strong", "middle", "dull"];

const gradeSchema = {
  type: "string",
  enum: GRADES,
};

export const qualitativeBriefJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    symbol: {
      type: "string",
      description: "Uppercase ticker symbol.",
    },
    companyName: {
      type: "string",
      description: "Company legal or common public name.",
    },
    generatedAt: {
      type: "string",
      description: "Generation date as YYYY-MM-DD.",
    },
    management: {
      type: "object",
      additionalProperties: false,
      properties: {
        grade: gradeSchema,
        sections: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              grade: gradeSchema,
              summary: { type: "string" },
              points: {
                type: "array",
                minItems: 2,
                items: { type: "string" },
              },
            },
            required: ["title", "grade", "summary", "points"],
          },
        },
      },
      required: ["grade", "sections"],
    },
    moat: {
      type: "object",
      additionalProperties: false,
      properties: {
        grade: gradeSchema,
        types: {
          type: "array",
          minItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string" },
              grade: gradeSchema,
              summary: { type: "string" },
            },
            required: ["type", "grade", "summary"],
          },
        },
      },
      required: ["grade", "types"],
    },
  },
  required: ["symbol", "companyName", "generatedAt", "management", "moat"],
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function wordCount(value) {
  if (typeof value !== "string") {
    return 0;
  }

  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isGrade(value) {
  return GRADES.includes(value);
}

function validateManagementSection(section, index, errors) {
  if (!isObject(section)) {
    errors.push(`management.sections[${index}] must be an object.`);
    return;
  }

  if (!hasText(section.title)) {
    errors.push(`management.sections[${index}].title is required.`);
  }

  if (!isGrade(section.grade)) {
    errors.push(`management.sections[${index}].grade must be one of ${GRADES.join(", ")}.`);
  }

  if (!hasText(section.summary)) {
    errors.push(`management.sections[${index}].summary is required.`);
  } else if (wordCount(section.summary) < 28) {
    errors.push(`management.sections[${index}].summary must contain at least 28 words.`);
  }

  if (!Array.isArray(section.points) || section.points.length < 2) {
    errors.push(`management.sections[${index}].points must contain at least two points.`);
  } else {
    section.points.forEach((point, pointIndex) => {
      if (!hasText(point)) {
        errors.push(`management.sections[${index}].points[${pointIndex}] is required.`);
      } else if (wordCount(point) < 16) {
        errors.push(`management.sections[${index}].points[${pointIndex}] must contain at least 16 words.`);
      }
    });
  }
}

function validateMoatType(moat, index, errors) {
  if (!isObject(moat)) {
    errors.push(`moat.types[${index}] must be an object.`);
    return;
  }

  if (!hasText(moat.type)) {
    errors.push(`moat.types[${index}].type is required.`);
  }

  if (!isGrade(moat.grade)) {
    errors.push(`moat.types[${index}].grade must be one of ${GRADES.join(", ")}.`);
  }

  if (!hasText(moat.summary)) {
    errors.push(`moat.types[${index}].summary is required.`);
  } else if (wordCount(moat.summary) < 30) {
    errors.push(`moat.types[${index}].summary must contain at least 30 words.`);
  }
}

export function validateQualitativeBrief(brief) {
  const errors = [];

  if (!isObject(brief)) {
    return ["brief must be an object."];
  }

  if (!hasText(brief.symbol)) {
    errors.push("symbol is required.");
  }

  if (!hasText(brief.companyName)) {
    errors.push("companyName is required.");
  }

  if (!hasText(brief.generatedAt)) {
    errors.push("generatedAt is required.");
  }

  if (!isObject(brief.management)) {
    errors.push("management is required.");
  } else {
    if (!isGrade(brief.management.grade)) {
      errors.push(`management.grade must be one of ${GRADES.join(", ")}.`);
    }

    if (!Array.isArray(brief.management.sections) || brief.management.sections.length !== 5) {
      errors.push("management.sections must contain exactly five sections.");
    } else {
      brief.management.sections.forEach((section, index) => validateManagementSection(section, index, errors));
    }
  }

  if (!isObject(brief.moat)) {
    errors.push("moat is required.");
  } else {
    if (!isGrade(brief.moat.grade)) {
      errors.push(`moat.grade must be one of ${GRADES.join(", ")}.`);
    }

    if (!Array.isArray(brief.moat.types) || brief.moat.types.length < 4) {
      errors.push("moat.types must contain at least four moat types.");
    } else {
      brief.moat.types.forEach((moat, index) => validateMoatType(moat, index, errors));
    }
  }

  return errors;
}

export function validateFactPacket(packet) {
  const errors = [];

  if (!isObject(packet)) {
    return ["fact packet must be an object."];
  }

  if (!hasText(packet.symbol)) {
    errors.push("symbol is required.");
  }

  if (!hasText(packet.companyName)) {
    errors.push("companyName is required.");
  }

  if (!Array.isArray(packet.facts) || packet.facts.length < 5) {
    errors.push("facts must contain at least five fact objects before generation.");
  } else {
    packet.facts.forEach((fact, index) => {
      if (!isObject(fact)) {
        errors.push(`facts[${index}] must be an object.`);
        return;
      }

      if (!hasText(fact.topic)) {
        errors.push(`facts[${index}].topic is required.`);
      }

      if (!hasText(fact.statement)) {
        errors.push(`facts[${index}].statement is required.`);
      }
    });
  }

  return errors;
}
