// Tiny terminal prompts for operator scripts. `ask` echoes; `askHidden` prints nothing while typing (for passwords and connection strings).
// Both need a real terminal (TTY): nothing secret ever goes through command-line arguments, shell history or logs.
import readline from "node:readline";

export function requireTty() {
  if (!process.stdin.isTTY) {
    console.error("This needs an interactive terminal (it asks for secrets without echoing them). Run it directly in your own terminal.");
    process.exit(1);
  }
}

export function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

export function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); }; // show the prompt, never the typed characters
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a.trim()); });
  });
}
