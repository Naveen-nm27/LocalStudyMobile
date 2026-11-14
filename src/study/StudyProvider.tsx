import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { toStudyDay } from '../data/reviewSchedule';
import { studyRepository, type Session, type Subject, type Topic } from '../data/studyRepository';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function useStudyState() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [today, setToday] = useState(() => toStudyDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const refreshId = useRef(0);
  const writing = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++refreshId.current;
    try {
      const [nextSubjects, nextTopics] = await Promise.all([studyRepository.listSubjects(), studyRepository.listAllTopics()]);
      if (request !== refreshId.current) return;
      setSubjects(nextSubjects);
      setTopics(nextTopics);
      setLoadError(null);
      setRevision((current) => current + 1);
    } catch (error) {
      if (request === refreshId.current) setLoadError(message(error));
    } finally {
      if (request === refreshId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const updateDay = () => setToday(toStudyDay(new Date()));
    const interval = setInterval(updateDay, 30_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateDay();
        void refresh();
      }
    });
    return () => {
      refreshId.current += 1;
      clearInterval(interval);
      listener.remove();
    };
  }, [refresh]);

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    if (writing.current) throw new Error('A change is already being saved.');
    writing.current = true;
    setBusy(true);
    try {
      await operation();
      await refresh();
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }, [refresh]);

  return { subjects, topics, today, loading, loadError, busy, revision, refresh, mutate };
}

const StudyContext = createContext<ReturnType<typeof useStudyState> | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const value = useStudyState();
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error('StudyProvider is required.');
  return value;
}

export function useTopicSessions(topicId: number | undefined) {
  const { revision } = useStudy();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ topicId: number; revision: number; retry: number; sessions: Session[]; error?: string }>();

  useEffect(() => {
    if (topicId === undefined) return;
    let current = true;
    studyRepository.listSessions(topicId).then(
      (sessions) => { if (current) setResult({ topicId, revision, retry, sessions }); },
      (error: unknown) => { if (current) setResult({ topicId, revision, retry, sessions: [], error: message(error) }); },
    );
    return () => { current = false; };
  }, [topicId, revision, retry]);

  const matching = result?.topicId === topicId && result?.revision === revision && result?.retry === retry;
  return {
    sessions: matching ? result.sessions : [],
    loading: topicId !== undefined && !matching,
    error: matching ? result.error : undefined,
    reload: () => setRetry((value) => value + 1),
  };
}
