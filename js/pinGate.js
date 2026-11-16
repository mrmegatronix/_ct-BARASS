// PIN-Coded Access Gate (pin-coded-access standard)
const SESSION_PIN_KEY = 'ct_barass_pin_unlocked';

export async function loadPinFromEnv() {
    try {
        const res = await fetch('.env', { cache: 'no-store' });
        if (res.ok) {
            const text = await res.text();
            const match = text.match(/^\s*BARASS_PIN\s*=\s*([^\r\n#]+)/m);
            if (match && match[1]) {
                return match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    } catch {
        // Fallback when opened without .env access
    }
    return '3528';
}

export function createOtpInput(container, options = {}) {
    const length = options.length || 4;
    const onChange = options.onChange || (() => {});
    const onComplete = options.onComplete || (() => {});
    const validate = options.validate || null;

    container.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'otp-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'One-time verification code');

    const status = document.createElement('div');
    status.className = 'otp-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const inputs = [];
    for (let i = 0; i < length; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.maxLength = 1;
        input.autocomplete = 'one-time-code';
        input.className = 'otp-cell';
        input.setAttribute('aria-label', `Digit ${i + 1}`);
        row.appendChild(input);
        inputs.push(input);
    }

    container.appendChild(row);
    container.appendChild(status);

    let locked = false;

    const getValue = () => inputs.map(inp => inp.value).join('');

    const syncFilledStates = () => {
        inputs.forEach(inp => {
            inp.classList.toggle('filled', inp.value.length === 1);
        });
    };

    const clearStateClasses = () => {
        row.classList.remove('otp-error', 'otp-success', 'otp-shake');
        status.textContent = '';
        status.className = 'otp-status';
    };

    const triggerComplete = async () => {
        const code = getValue();
        onChange(code);
        if (code.length !== length) return;
        onComplete(code);
        if (typeof validate === 'function') {
            const ok = await validate(code);
            if (ok) {
                setSuccess('Verified');
            } else {
                setError('Invalid code, try again');
            }
        }
    };

    const setError = (message = 'Invalid code, try again') => {
        row.classList.remove('otp-success', 'otp-shake');
        void row.offsetWidth;
        row.classList.add('otp-error', 'otp-shake');
        status.textContent = message;
        status.className = 'otp-status error';
    };

    const setSuccess = (message = 'Verified') => {
        locked = true;
        row.classList.remove('otp-error', 'otp-shake');
        row.classList.add('otp-success');
        inputs.forEach(inp => { inp.readOnly = true; });
        status.textContent = message;
        status.className = 'otp-status success';
    };

    const clear = () => {
        locked = false;
        inputs.forEach(inp => {
            inp.value = '';
            inp.readOnly = false;
        });
        syncFilledStates();
        clearStateClasses();
        onChange('');
        inputs[0]?.focus();
    };

    const reset = () => clear();

    const setValue = (str) => {
        const digits = String(str || '').replace(/\D/g, '').slice(0, length);
        inputs.forEach((inp, idx) => {
            inp.value = digits[idx] || '';
        });
        syncFilledStates();
        clearStateClasses();
        onChange(getValue());
        if (digits.length === length) {
            triggerComplete();
        }
    };

    const focus = (idx = 0) => {
        const target = inputs[Math.max(0, Math.min(idx, length - 1))];
        if (target) target.focus();
    };

    inputs.forEach((inp, idx) => {
        inp.addEventListener('focus', () => {
            inp.select();
        });

        inp.addEventListener('input', () => {
            if (locked) return;
            clearStateClasses();
            const digits = inp.value.replace(/\D/g, '');
            if (!digits) {
                inp.value = '';
                syncFilledStates();
                onChange(getValue());
                return;
            }
            inp.value = digits[0];
            syncFilledStates();

            if (getValue().length === length) {
                triggerComplete();
                return;
            }

            // Focus next empty cell, or next cell
            let nextIdx = inputs.findIndex((el, j) => j > idx && !el.value);
            if (nextIdx === -1 && idx + 1 < length) nextIdx = idx + 1;
            if (nextIdx !== -1) inputs[nextIdx].focus();
            onChange(getValue());
        });

        inp.addEventListener('keydown', (e) => {
            if (locked) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (idx > 0) inputs[idx - 1].focus();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (idx < length - 1) inputs[idx + 1].focus();
            } else if (e.key === 'Backspace') {
                clearStateClasses();
                if (inp.value) {
                    inp.value = '';
                    syncFilledStates();
                    onChange(getValue());
                    e.preventDefault();
                } else if (idx > 0) {
                    inputs[idx - 1].value = '';
                    syncFilledStates();
                    inputs[idx - 1].focus();
                    onChange(getValue());
                    e.preventDefault();
                }
            } else if (e.key === 'Delete') {
                clearStateClasses();
                inp.value = '';
                syncFilledStates();
                onChange(getValue());
                e.preventDefault();
            } else if (e.key === 'Home') {
                e.preventDefault();
                inputs[0].focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                const lastFilled = inputs.reduce((acc, el, j) => (el.value ? j : acc), -1);
                inputs[lastFilled >= 0 ? lastFilled : length - 1].focus();
            }
        });

        inp.addEventListener('paste', (e) => {
            if (locked) return;
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const digits = text.replace(/\D/g, '').slice(0, length - idx);
            if (!digits) return;
            clearStateClasses();
            for (let k = 0; k < digits.length; k++) {
                if (inputs[idx + k]) inputs[idx + k].value = digits[k];
            }
            syncFilledStates();
            const nextEmpty = inputs.findIndex(el => !el.value);
            if (nextEmpty !== -1) {
                inputs[nextEmpty].focus();
            } else {
                inputs[length - 1].focus();
            }
            if (getValue().length === length) {
                triggerComplete();
            } else {
                onChange(getValue());
            }
        });
    });

    return { getValue, setValue, clear, focus, setError, setSuccess, reset };
}

export async function ensurePinUnlocked() {
    if (sessionStorage.getItem(SESSION_PIN_KEY) === '1') {
        return true;
    }

    const expectedPin = await loadPinFromEnv();
    const gate = document.getElementById('pinGate');
    const otpContainer = document.getElementById('pinOtpContainer');
    const clearBtn = document.getElementById('btnPinClear');
    if (!gate || !otpContainer) return true;

    gate.classList.remove('hidden');

    return new Promise((resolve) => {
        const controller = createOtpInput(otpContainer, {
            length: expectedPin.length,
            validate: (code) => {
                if (code === expectedPin) {
                    sessionStorage.setItem(SESSION_PIN_KEY, '1');
                    setTimeout(() => {
                        gate.classList.add('pin-gate-fade');
                        setTimeout(() => {
                            gate.classList.add('hidden');
                            gate.classList.remove('pin-gate-fade');
                            resolve(true);
                        }, 280);
                    }, 420);
                    return true;
                }
                setTimeout(() => {
                    controller.clear();
                }, 650);
                return false;
            }
        });

        if (clearBtn) {
            clearBtn.onclick = () => controller.clear();
        }
        setTimeout(() => controller.focus(0), 60);
    });
}

export function lockSession() {
    sessionStorage.removeItem(SESSION_PIN_KEY);
    window.location.reload();
}
