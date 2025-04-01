import ora, { Ora } from "ora";

/**
 * Color codes for console output
 */
export const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

export type ColorName = keyof typeof colors;

/**
 * Log a message with optional color
 */
export function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create a spinner with the given text
 */
export function createSpinner(text: string): Ora {
  return ora(text);
}

/**
 * Helper class to handle logging with or without spinners
 */
export class Logger {
  private useSpinner: boolean;
  private spinner: Ora | null = null;

  constructor(useSpinner: boolean = true) {
    this.useSpinner = useSpinner;
  }

  /**
   * Start a spinner or log a message
   */
  start(message: string): void {
    if (this.useSpinner) {
      this.spinner = createSpinner(message).start();
    } else {
      log(message, "blue");
    }
  }

  /**
   * Log a success message or update spinner
   */
  success(message: string): void {
    if (this.useSpinner && this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else {
      log(`✅ ${message}`, "green");
    }
  }

  /**
   * Log an error message or update spinner
   */
  error(message: string): void {
    if (this.useSpinner && this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    } else {
      log(`❌ ${message}`, "red");
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    if (this.useSpinner && this.spinner) {
      // Stop the spinner to show the warning
      const text = this.spinner.text;
      this.spinner.stop();
      log(`⚠️ ${message}`, "yellow");
      // Restart the spinner with the original text
      this.spinner = createSpinner(text).start();
    } else {
      log(`⚠️ ${message}`, "yellow");
    }
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    if (this.useSpinner && this.spinner) {
      // Stop the spinner to show the info
      const text = this.spinner.text;
      this.spinner.stop();
      log(message, "cyan");
      // Restart the spinner with the original text
      this.spinner = createSpinner(text).start();
    } else {
      log(message, "cyan");
    }
  }
}
