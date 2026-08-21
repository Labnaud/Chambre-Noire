import type { useTimer } from '../../hooks/useTimer';
import type { BrewMethod } from '../../types';
import { formatDuration, profileFor } from '../../lib/brew';
import Icons from '../Icons';

interface ShotTimerControlsProps {
    show: boolean;
    setShow: (v: boolean) => void;
    manualTimeInput: boolean;
    setManualTimeInput: (v: boolean) => void;
    manualTimerValue: string;
    setManualTimerValue: (v: string) => void;
    timer: ReturnType<typeof useTimer>;
    method: BrewMethod;
}

export default function ShotTimerControls({
    show, setShow,
    manualTimeInput, setManualTimeInput,
    manualTimerValue, setManualTimerValue,
    timer, method,
}: ShotTimerControlsProps) {
    const { timerRunning, timerSeconds, startTimer, stopTimer, resetTimer } = timer;

    // A brew measured in minutes should be entered in minutes. Typing 205 into a
    // seconds box is arithmetic the app can do itself.
    const longBrew = profileFor(method).targetTimeSec[1] >= 60;
    const totalSeconds = Number(manualTimerValue) || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);

    // Derived from the single stored value, so typing 90 into seconds rolls
    // over into 1 min 30 rather than being rejected.
    const writeParts = (minutePart: string, secondPart: string) => {
        if (minutePart === '' && secondPart === '') {
            setManualTimerValue('');
            return;
        }
        const m = Math.max(0, Math.floor(Number(minutePart) || 0));
        const sec = Math.max(0, Math.floor(Number(secondPart) || 0));
        setManualTimerValue(String(m * 60 + sec));
    };

    return (
        <div className="advanced-tools">
            <div className="advanced-group">
                <button
                    type="button"
                    className={`advanced-toggle ${show ? 'advanced-toggle--active' : ''}`}
                    onClick={() => setShow(!show)}
                    aria-expanded={show}
                >
                    <Icons.Zap />
                    <span>Shot Time</span>
                    <span className="advanced-toggle__badge">{show ? 'On' : 'Off'}</span>
                    {show ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                </button>
                <div className={`collapsible ${show ? 'collapsible--open' : ''}`}>
                    <div className="collapsible__inner" inert={!show ? true : undefined}>
                        <div className="shot-timer">
                            <div className="shot-timer__mode-toggle" role="group" aria-label="Timer mode">
                                <button
                                    type="button"
                                    className={`shot-timer__mode-btn ${!manualTimeInput ? 'shot-timer__mode-btn--active' : ''}`}
                                    onClick={() => setManualTimeInput(false)}
                                    aria-pressed={!manualTimeInput}
                                >
                                    Stopwatch
                                </button>
                                <button
                                    type="button"
                                    className={`shot-timer__mode-btn ${manualTimeInput ? 'shot-timer__mode-btn--active' : ''}`}
                                    onClick={() => setManualTimeInput(true)}
                                    aria-pressed={manualTimeInput}
                                >
                                    Manual
                                </button>
                            </div>
                            {manualTimeInput ? (
                                longBrew ? (
                                    <div className="shot-timer__manual shot-timer__manual--split">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            step="1"
                                            min="0"
                                            max="20"
                                            placeholder="0"
                                            value={manualTimerValue === '' ? '' : String(mins)}
                                            onChange={(e) => writeParts(e.target.value, manualTimerValue === '' ? '' : String(secs))}
                                            className="shot-timer__input shot-timer__input--part"
                                            aria-label="Extraction minutes"
                                        />
                                        <span className="shot-timer__unit">min</span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            step="1"
                                            min="0"
                                            max="59"
                                            placeholder="00"
                                            value={manualTimerValue === '' ? '' : String(secs)}
                                            onChange={(e) => writeParts(manualTimerValue === '' ? '' : String(mins), e.target.value)}
                                            className="shot-timer__input shot-timer__input--part"
                                            aria-label="Extraction seconds"
                                        />
                                        <span className="shot-timer__unit">sec</span>
                                    </div>
                                ) : (
                                    <div className="shot-timer__manual">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.1"
                                            min="0"
                                            max="600"
                                            placeholder="0.0"
                                            value={manualTimerValue}
                                            onChange={(e) => setManualTimerValue(e.target.value)}
                                            className="shot-timer__input"
                                            aria-label="Extraction time in seconds"
                                        />
                                        <span className="shot-timer__unit">
                                            seconds
                                            {Number(manualTimerValue) >= 60 && (
                                                <span className="shot-timer__as-minutes">
                                                    {formatDuration(Number(manualTimerValue))}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )
                            ) : (
                                <>
                                    <div className="shot-timer__display">
                                        <span className="shot-timer__time">{formatDuration(timerSeconds)}</span>
                                    </div>
                                    <div className="shot-timer__controls">
                                        {timerRunning ? (
                                            <button type="button" className="shot-timer__btn shot-timer__btn--stop" onClick={stopTimer} title="Stop" aria-label="Stop timer">
                                                <span aria-hidden="true">⏸</span>
                                            </button>
                                        ) : (
                                            <button type="button" className="shot-timer__btn shot-timer__btn--start" onClick={startTimer} title="Start" aria-label="Start timer">
                                                <span aria-hidden="true">▶</span>
                                            </button>
                                        )}
                                        <button type="button" className="shot-timer__btn shot-timer__btn--reset" onClick={resetTimer} title="Reset" disabled={timerSeconds === 0} aria-label="Reset timer">
                                            <span aria-hidden="true">↺</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
