import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  Cloud,
  CloudOff,
  Cpu,
  Flag,
  Footprints,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrafficCone,
  Trophy,
  Users,
  type LucideProps,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import cpsLogo from '@/assets/CPS Campus Protection Services logo(1).png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  CPS_AREAS,
  QUEST_CHECKPOINTS,
  QUEST_TOTAL,
  type QuestIconName,
} from './questCatalog';
import { useSafetyQuestProgress, type QuestSyncState } from './useSafetyQuestProgress';
import './safety-quest.css';

const ICONS: Record<QuestIconName, ComponentType<LucideProps>> = {
  student: GraduationCap,
  fraud: ShieldAlert,
  verify: KeyRound,
  prevention: ShieldCheck,
  investigation: Search,
  office: Building2,
  services: Cpu,
  control: Flag,
};

const SYNC_COPY: Record<QuestSyncState, string> = {
  loading: 'Loading progress',
  saving: 'Saving progress',
  saved: 'Saved to your account',
  device: 'Saved on this device',
};

const ROUTE_POINTS = QUEST_CHECKPOINTS
  .map(({ runnerPosition: point }) => `${point.x},${point.y}`)
  .join(' ');

type AnswerOutcome = 'correct' | 'wrong' | null;

export function SafetyQuestGame({ userId }: { userId: string | null | undefined }) {
  const { progress, syncState, recordAnswer, resetQuest } = useSafetyQuestProgress(userId);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [outcome, setOutcome] = useState<AnswerOutcome>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const currentIndex = Math.min(progress.currentCheckpoint, QUEST_TOTAL - 1);
  const currentCheckpoint = QUEST_CHECKPOINTS[currentIndex];
  const runnerPosition = progress.currentCheckpoint >= QUEST_TOTAL
    ? QUEST_CHECKPOINTS[QUEST_TOTAL - 1].runnerPosition
    : currentCheckpoint.runnerPosition;
  const completionPercent = Math.round((progress.currentCheckpoint / QUEST_TOTAL) * 100);
  const isComplete = progress.currentCheckpoint >= QUEST_TOTAL;


  useEffect(() => {
    const scroller = stageRef.current;
    if (!scroller || isComplete) return;
    const node = scroller.querySelector<HTMLElement>(`[data-checkpoint-index="${currentIndex}"]`);
    if (!node) return;
    const targetLeft = Math.max(0, node.offsetLeft + node.offsetWidth / 2 - scroller.clientWidth / 2);
    scroller.scrollTo({ left: targetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [currentIndex, isComplete, prefersReducedMotion]);

  const openCheckpoint = (index: number) => {
    if (index > progress.currentCheckpoint) return;
    setSelectedOption('');
    setOutcome(null);
    setSelectedCheckpoint(index);
  };

  const closeCheckpoint = () => {
    setSelectedCheckpoint(null);
    setSelectedOption('');
    setOutcome(null);
  };

  const submitAnswer = () => {
    if (selectedCheckpoint === null || !selectedOption) return;
    const checkpoint = QUEST_CHECKPOINTS[selectedCheckpoint];
    const option = checkpoint.options.find((item) => item.id === selectedOption);
    if (!option) return;

    const answerIsCorrect = option.correct === true;
    setOutcome(answerIsCorrect ? 'correct' : 'wrong');
    void recordAnswer(selectedCheckpoint, checkpoint.id, option.id, answerIsCorrect);
  };

  const selected = selectedCheckpoint === null ? null : QUEST_CHECKPOINTS[selectedCheckpoint];
  const selectedWasCompleted = selectedCheckpoint !== null && selectedCheckpoint < progress.currentCheckpoint;
  const showLesson = outcome === 'correct' || (selectedWasCompleted && outcome !== 'wrong');
  const SyncIcon = syncState === 'device' ? CloudOff : Cloud;

  return (
    <div className="safety-quest-shell" data-testid="safety-quest-page">
      <header className="safety-quest-topbar">
        <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <ShieldCheck className="h-5 w-5 text-[#F2A900]" aria-hidden="true" />
          <span className="font-extrabold tracking-tight text-white">CCSF Safety Quest</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/70" role="status" aria-live="polite">
          <SyncIcon className={cn('h-4 w-4', syncState === 'saving' && 'animate-pulse')} aria-hidden="true" />
          <span className="hidden sm:inline">{SYNC_COPY[syncState]}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-3 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="safety-quest-hero" aria-labelledby="quest-title">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F2A900]/35 bg-[#F2A900]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#FFD36A]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Interactive student onboarding
            </div>
            <h1 id="quest-title" className="text-balance text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Learn the campus. <span className="text-[#F2A900]">Spot the risk.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Tap the active person or station, answer one practical question, and watch your student marker move toward Control. This is a learning journey—not a pass-or-fail test.
            </p>
          </div>

          <div className="safety-quest-progress-card">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">Mission progress</p>
                <p className="mt-1 text-3xl font-black text-white">{progress.currentCheckpoint}<span className="text-base text-white/50"> / {QUEST_TOTAL}</span></p>
              </div>
              <Trophy className={cn('h-8 w-8', isComplete ? 'text-[#F2A900]' : 'text-white/25')} aria-hidden="true" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#F2A900] to-[#FFE7A6]"
                initial={{ width: '0%' }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-white/60">{progress.attempts} answer{progress.attempts === 1 ? '' : 's'} submitted</p>
          </div>
        </section>

        <section className="mt-7" aria-label="Interactive Safety Quest game board">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white/75">
              <Footprints className="h-4 w-4 text-[#F2A900]" aria-hidden="true" />
              {isComplete ? 'Journey complete' : `Next: ${currentCheckpoint.title}`}
            </div>
            <p className="text-xs font-semibold text-white/50 md:hidden">Swipe the scene to explore →</p>
          </div>

          <div className="safety-quest-frame">
            <div className="safety-quest-scroll" ref={stageRef}>
              <div className="safety-quest-stage">
                <motion.img
                  src="/safety-quest-campus.jpg"
                  alt=""
                  className="safety-quest-campus-photo"
                  draggable={false}
                  initial={false}
                  animate={prefersReducedMotion
                    ? { scale: 1, x: '0%', y: '0%' }
                    : { scale: [1, 1.025, 1], x: ['0%', '-0.35%', '0%'], y: ['0%', '-0.2%', '0%'] }}
                  transition={{ duration: 24, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                />
                <div className="safety-quest-sunwash" aria-hidden="true" />
                <div className="safety-quest-fountain-shimmer" aria-hidden="true" />
                <div className="safety-quest-vignette" aria-hidden="true" />

                <div className="safety-quest-brand-lockup" aria-label="TUT, CCSF and Campus Protection Services partnership">
                  <div className="safety-quest-brand-tut">
                    <InstitutionBrand
                      size="compact"
                      themeOverride="dark"
                      className="w-full justify-center"
                      ccsfClassName="!w-auto"
                      tutClassName="!w-auto"
                    />
                  </div>
                  <div className="safety-quest-brand-community">
                    <img src={cpsLogo} alt="Campus Protection Services" />
                  </div>
                </div>

                <div className="safety-quest-scene-caption">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Building 21 &middot; Fountain precinct
                </div>

                <div className="safety-quest-location-chip safety-quest-location-chip--office">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  CPS office · Building 4 · G-51
                </div>
                <div className="safety-quest-location-chip safety-quest-location-chip--control">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Control · Building 4 · G-63
                </div>

                <svg className="safety-quest-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points={ROUTE_POINTS} pathLength="1" className="safety-quest-route-base" />
                  <motion.polyline
                    points={ROUTE_POINTS}
                    pathLength="1"
                    className="safety-quest-route-complete"
                    initial={false}
                    animate={{ strokeDashoffset: 1 - progress.currentCheckpoint / QUEST_TOTAL }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: 'easeInOut' }}
                  />
                </svg>

                <motion.div
                  className="safety-quest-runner"
                  initial={false}
                  animate={{ left: `${runnerPosition.x}%`, top: `${runnerPosition.y}%` }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.9, type: 'spring', stiffness: 90, damping: 17 }}
                  aria-label={`Your position: checkpoint ${Math.min(progress.currentCheckpoint + 1, QUEST_TOTAL)}`}
                >
                  <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  <span>You</span>
                </motion.div>

                {QUEST_CHECKPOINTS.map((checkpoint, index) => {
                  const Icon = ICONS[checkpoint.icon];
                  const complete = index < progress.currentCheckpoint;
                  const active = index === progress.currentCheckpoint && !isComplete;
                  const locked = index > progress.currentCheckpoint || isComplete && !complete;
                  return (
                    <button
                      key={checkpoint.id}
                      type="button"
                      data-checkpoint-index={index}
                      data-testid={`quest-checkpoint-${index + 1}`}
                      className={cn(
                        'safety-quest-node',
                        complete && 'is-complete',
                        active && 'is-active',
                        locked && 'is-locked',
                      )}
                      style={{ left: `${checkpoint.position.x}%`, top: `${checkpoint.position.y}%` }}
                      onClick={() => openCheckpoint(index)}
                      disabled={locked}
                      aria-label={`${checkpoint.eyebrow}: ${checkpoint.title}. ${complete ? 'Completed; tap to review.' : active ? 'Active; tap to answer.' : 'Locked.'}`}
                    >
                      <span className="safety-quest-node-ring" aria-hidden="true" />
                      <span className="safety-quest-node-icon">
                        {complete ? <Check className="h-5 w-5" /> : locked ? <LockKeyhole className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
                      </span>
                      <span className="safety-quest-node-copy">
                        <small>{complete ? 'Mastered' : active ? 'Tap to begin' : `Checkpoint ${index + 1}`}</small>
                        <strong>{checkpoint.title}</strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.section
              key="complete"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="safety-quest-complete-card"
              aria-labelledby="mission-complete-title"
            >
              <div className="safety-quest-complete-icon"><Trophy className="h-8 w-8" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F2A900]">Safety Quest complete</p>
                <h2 id="mission-complete-title" className="mt-1 text-2xl font-black text-white">You know where to go and what to question.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                  Remember the two destinations: the CPS office is Building 4, G-51; reports to Control go to Building 4, G-63. Keep the fraud checks with you whenever a service asks for trust, credentials, or payment.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                <Button asChild className="bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]">
                  <Link to="/dashboard">Return to dashboard <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void resetQuest()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Play again
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section key="brief" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-7 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="safety-quest-info-card">
                <BookOpenCheck className="h-6 w-6 text-[#F2A900]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">Two destinations to remember</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <LocationFact label="CPS office" location="Building 4 · G-51" />
                    <LocationFact label="Control / reports" location="Building 4 · G-63" />
                  </div>
                </div>
              </div>
              <div className="safety-quest-info-card">
                <Users className="h-6 w-6 text-[#F2A900]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">CPS areas you will meet</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CPS_AREAS.map((area) => <span key={area} className="safety-quest-service-pill">{area}</span>)}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Dialog open={selectedCheckpoint !== null} onOpenChange={(open) => !open && closeCheckpoint()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#09172B] p-0 text-white shadow-2xl sm:max-w-xl">
          {selected && (
            <div>
              <div className="border-b border-white/10 bg-gradient-to-br from-[#123A70] via-[#0C274E] to-[#151027] px-6 py-6">
                <DialogHeader className="text-left">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl border border-[#F2A900]/35 bg-[#F2A900]/12 p-3 text-[#F2A900]">
                      {(() => { const Icon = ICONS[selected.icon]; return <Icon className="h-6 w-6" aria-hidden="true" />; })()}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F2A900]">{selected.eyebrow}</p>
                      <p className="mt-1 text-xs font-semibold text-white/60">{selected.character}</p>
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-black text-white">{selected.title}</DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-white/70">
                    {showLesson ? 'Review the lesson you unlocked.' : selected.question}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-6">
                {showLesson ? (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
                        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                        {outcome === 'correct' ? 'Correct—checkpoint unlocked' : 'Checkpoint mastered'}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/80">{selected.lesson}</p>
                    </div>
                    <Button className="mt-5 w-full bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]" onClick={closeCheckpoint}>
                      {isComplete ? 'View mission summary' : outcome === 'correct' ? 'Continue the journey' : 'Back to the scene'}
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="gap-3" aria-label="Answer choices">
                      {selected.options.map((option, optionIndex) => (
                        <Label
                          key={option.id}
                          htmlFor={`quest-option-${option.id}`}
                          className={cn(
                            'safety-quest-answer',
                            selectedOption === option.id && 'is-selected',
                          )}
                        >
                          <RadioGroupItem id={`quest-option-${option.id}`} value={option.id} className="border-white/35 text-[#F2A900]" />
                          <span className="safety-quest-answer-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                          <span>{option.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>

                    {outcome === 'wrong' && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4" role="alert">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-black text-rose-200">Pause and look again</p>
                            <p className="mt-1 text-xs leading-5 text-white/70">This journey is here to teach, so try another answer. Look for the safest official action.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="mt-5 flex gap-3">
                      {outcome === 'wrong' ? (
                        <Button className="w-full bg-white font-extrabold text-[#07152A] hover:bg-white/90" onClick={() => { setOutcome(null); setSelectedOption(''); }}>
                          Try again
                        </Button>
                      ) : (
                        <Button className="w-full bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]" disabled={!selectedOption} onClick={submitAnswer}>
                          Check my answer <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationFact({ label, location }: { label: string; location: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
      <p className="text-xs font-semibold text-white/50">{label}</p>
      <p className="mt-0.5 text-sm font-black text-white">{location}</p>
    </div>
  );
}
