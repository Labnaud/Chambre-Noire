import type { useTimer } from '../../hooks/useTimer';
import Icons from '../Icons';

interface ShotTimerControlsProps {
    show: boolean;
    setShow: (v: boolean) => void;
    manualTimeInput: boolean;
    setManualTimeInput: (v: boolean) => void;
    manualTimerValue: string;
    setManualTimerValue: (v: string) => void;
    timer: ReturnType<typeof useTimer>;
}

export default function ShotTimerControls({
    show, setShow,
    manualTimeInput, setManualTimeInput,
    manualTimerValue, setManualTimerValue,
    timer,
}: ShotTimerControlsProps) {
    const { timerRunning, timerSeconds, startTimer, stopTimer, resetTimer } = timer;

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
                                    <span className="shot-timer__unit">seconds</span>
                                </div>
                            ) : (
                                <>
                                    <div className="shot-timer__display">
                                        <span className="shot-timer__time">{timerSeconds.toFixed(1)}s</span>
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
