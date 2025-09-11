// Questions loader module
(function() {
  async function fetchQuestions() {
    const res = await fetch('/questions.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load questions.json: ' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data.categories)) throw new Error('Invalid questions format');
    return data.categories;
  }

  window.fetchQuestions = fetchQuestions;
})();

