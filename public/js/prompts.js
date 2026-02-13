// 62 interview questions across 8 life stages

export const stages = [
  {
    id: 'early-childhood',
    name: 'Early Childhood',
    color: 'var(--stage-childhood)',
    questions: [
      'What is your earliest memory? Where were you, and what do you remember seeing, hearing, or feeling?',
      'Describe the home you grew up in. What did it look like? What did it smell like?',
      'Who were the most important people in your early life? What made them special?',
      'What was your favorite thing to do as a small child?',
      'Did you have a favorite toy, blanket, or comfort object? Tell me about it.',
      'What family traditions or routines do you remember from your early years?',
      'Was there a moment from your childhood that you think shaped who you became?',
      'What is a funny or unexpected story from when you were very young?',
    ],
  },
  {
    id: 'school-years',
    name: 'School Years',
    color: 'var(--stage-school)',
    questions: [
      'What do you remember about your first day of school?',
      'Who was your best friend in school? How did you meet?',
      'Which teacher had the biggest impact on you, and why?',
      'What subjects did you love? What subjects did you dread?',
      'Tell me about a proud moment from your school years.',
      'Were you ever in trouble at school? What happened?',
      'What was the social world of your school like? Where did you fit in?',
      'Is there a lesson you learned during school that stuck with you for life?',
    ],
  },
  {
    id: 'coming-of-age',
    name: 'Coming of Age',
    color: 'var(--stage-coming-of-age)',
    questions: [
      'What was your first real job? What was it like?',
      'When did you first feel like an adult? What triggered that feeling?',
      'Tell me about a moment when you realized the world was bigger than you thought.',
      'What music, books, or movies shaped you during this time?',
      'Did you leave home? What was that experience like?',
      'Who were your closest friends as a young adult? What did you do together?',
      'Was there a risk you took that changed the direction of your life?',
      'What did you dream about becoming when you were young?',
    ],
  },
  {
    id: 'love-relationships',
    name: 'Love & Relationships',
    color: 'var(--stage-love)',
    questions: [
      'Tell me the story of how you met the love of your life.',
      'What was your first date like? Where did you go?',
      'When did you know this was the person for you?',
      'What is the best piece of relationship advice you\'ve ever received or learned?',
      'Describe a moment of deep connection with someone you love.',
      'How has your understanding of love changed over the years?',
      'Tell me about a friendship that has stood the test of time.',
      'Is there someone who believed in you when you didn\'t believe in yourself?',
    ],
  },
  {
    id: 'career-work',
    name: 'Career & Work',
    color: 'var(--stage-career)',
    questions: [
      'Walk me through your career path. How did you end up where you did?',
      'What was your proudest professional accomplishment?',
      'Tell me about a mentor or colleague who changed how you think.',
      'What was the hardest decision you ever made at work?',
      'Did you ever have a job you hated? What made it so bad?',
      'What skills or values did your work teach you?',
      'If you could do your career over, would you change anything?',
      'What does "success" mean to you? Has that definition changed?',
    ],
  },
  {
    id: 'family-parenthood',
    name: 'Family & Parenthood',
    color: 'var(--stage-family)',
    questions: [
      'Tell me about when you found out you were going to be a parent. What did you feel?',
      'What kind of parent did you want to be? Did that match reality?',
      'Describe a moment with your children that you\'ll never forget.',
      'What is the hardest thing about being a parent?',
      'What traditions did you create for your own family?',
      'How is your relationship with your parents or siblings now compared to when you were young?',
      'What do you most want your children to know about your life?',
      'Tell me about a time your family surprised you — for better or worse.',
    ],
  },
  {
    id: 'challenges-growth',
    name: 'Challenges & Growth',
    color: 'var(--stage-challenges)',
    questions: [
      'What is the hardest thing you\'ve ever been through? How did you get through it?',
      'Have you ever experienced a loss that changed you? Tell me about it.',
      'Was there a failure that taught you something important?',
      'Tell me about a time you had to start over.',
      'What is something you\'ve forgiven — in yourself or someone else?',
      'How have your beliefs or values changed over the course of your life?',
    ],
  },
  {
    id: 'reflections-wisdom',
    name: 'Reflections & Wisdom',
    color: 'var(--stage-reflections)',
    questions: [
      'If you could talk to yourself at 20 years old, what would you say?',
      'What are you most proud of in your life?',
      'What brings you the most joy right now?',
      'Is there something you wish more people understood about your generation?',
      'What does a good day look like for you now?',
      'What legacy do you hope to leave behind?',
      'If your life were a book, what would the title be?',
      'What is the most important thing you\'ve learned in your life?',
    ],
  },
];

export const totalQuestions = stages.reduce((sum, s) => sum + s.questions.length, 0);

export function getQuestion(stageIndex, questionIndex) {
  const stage = stages[stageIndex];
  if (!stage) return null;
  const question = stage.questions[questionIndex];
  if (question === undefined) return null;
  return { stage: stage.name, stageId: stage.id, question, stageIndex, questionIndex };
}

export function getAbsoluteIndex(stageIndex, questionIndex) {
  let idx = 0;
  for (let i = 0; i < stageIndex; i++) idx += stages[i].questions.length;
  return idx + questionIndex;
}

export function getStageClass(stageId) {
  return `stage-${stageId}`;
}
