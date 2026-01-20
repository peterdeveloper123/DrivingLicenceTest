function extractAllQuestions(tests) {
  const result = [];
  for (const test of tests) {
    const { otazky, odpovede, okruhy } = test;
    const okruhRanges = Object.values(okruhy)
      .map((o) => o[0])
      .sort((a, b) => a.zacina - b.zacina);
    const getOkruhForQuestion = (questionNumber) => {
      let current = null;
      for (const o of okruhRanges) {
        if (questionNumber >= o.zacina) {
          current = o.txt;
        } else {
          break;
        }
      }
      return current;
    };
    for (const questionKey of Object.keys(otazky)) {
      const questionNumber = Number(questionKey);
      const question = otazky[questionKey][0];
      const answersRaw = odpovede[questionKey];
      const correctIndex = question.platna - 1;

      result.push({
        questionName: question.text,
        answers: answersRaw.map((a, i) => ({
          text: a.odpoved,
          isCorrect: i === correctIndex,
        })),
        imageUrl: question.obrazok || null,
        okruh: getOkruhForQuestion(questionNumber),
      });
    }
  }
  return result;
}

const allQuestions = extractAllQuestions(tests);
const uniqueQuestions = [
  ...new Map(
    allQuestions.map((q) => [
      JSON.stringify({
        q: q.questionName,
        a: q.answers.find((a) => a.isCorrect).text,
        o: q.okruh,
      }),
      q,
    ]),
  ).values(),
];

const uniqueOkruhy = [...new Set(uniqueQuestions.map((q) => q.okruh))];

const otazkyPodlaOkruhov = uniqueOkruhy.filter(Boolean).map((okruh) => ({
  okruh,
  questions: uniqueQuestions.filter((q) => q.okruh === okruh),
}));

console.log(otazkyPodlaOkruhov);
