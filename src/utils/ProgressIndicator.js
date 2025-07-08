
const ora = require("ora");
const chalk = require("chalk");

class ProgressIndicator {
  constructor() {
    this.spinner = null;
    this.progressState = {
      current: 0,
      total: 0,
      startTime: null,
      operation: null
    };
  }

  start(message, total = 0) {
    this.progressState = {
      current: 0,
      total,
      startTime: Date.now(),
      operation: message
    };

    this.spinner = ora({
      text: this.formatMessage(message),
      spinner: 'dots12'
    }).start();

    return this;
  }

  update(current, message = null) {
    if (!this.spinner) return this;

    this.progressState.current = current;
    
    const displayMessage = message || this.progressState.operation;
    this.spinner.text = this.formatMessage(displayMessage);

    return this;
  }

  increment(message = null) {
    return this.update(this.progressState.current + 1, message);
  }

  succeed(message = null) {
    if (!this.spinner) return this;

    const finalMessage = message || `${this.progressState.operation} completed`;
    const duration = this.getDuration();
    
    this.spinner.succeed(`${finalMessage} ${chalk.gray(`(${duration})`)}`);
    this.spinner = null;

    return this;
  }

  fail(message = null) {
    if (!this.spinner) return this;

    const finalMessage = message || `${this.progressState.operation} failed`;
    const duration = this.getDuration();
    
    this.spinner.fail(`${finalMessage} ${chalk.gray(`(${duration})`)}`);
    this.spinner = null;

    return this;
  }

  warn(message) {
    if (!this.spinner) return this;

    const duration = this.getDuration();
    this.spinner.warn(`${message} ${chalk.gray(`(${duration})`)}`);
    this.spinner = null;

    return this;
  }

  info(message) {
    if (!this.spinner) return this;

    const duration = this.getDuration();
    this.spinner.info(`${message} ${chalk.gray(`(${duration})`)}`);
    this.spinner = null;

    return this;
  }

  formatMessage(message) {
    const { current, total } = this.progressState;
    
    if (total > 0) {
      const percentage = Math.round((current / total) * 100);
      const eta = this.getETA();
      return `${message} [${current}/${total}] ${percentage}% ${eta}`;
    }
    
    return message;
  }

  getDuration() {
    if (!this.progressState.startTime) return '';
    
    const duration = Date.now() - this.progressState.startTime;
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  getETA() {
    const { current, total, startTime } = this.progressState;
    
    if (!startTime || current === 0 || total === 0) return '';
    
    const elapsed = Date.now() - startTime;
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    
    if (remaining < 60000) {
      return chalk.gray(`ETA: ${Math.round(remaining / 1000)}s`);
    }
    
    const minutes = Math.floor(remaining / 60000);
    return chalk.gray(`ETA: ${minutes}m`);
  }

  static withProgress(operation, total = 0) {
    const progress = new ProgressIndicator();
    return {
      progress,
      start: (message) => progress.start(message, total),
      update: (current, message) => progress.update(current, message),
      increment: (message) => progress.increment(message),
      succeed: (message) => progress.succeed(message),
      fail: (message) => progress.fail(message),
      warn: (message) => progress.warn(message),
      info: (message) => progress.info(message)
    };
  }
}

module.exports = { ProgressIndicator };
