import * as os from "os";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { spawn, SpawnOptions } from "child_process";
import chalk from "chalk";

const prompt = () => {
  const user = os.userInfo().username;
  const host = os.hostname();
  const dirname = process.cwd().replace(os.homedir(), "~")
  return chalk.green(user + "@" + host) + ":" + chalk.blue(dirname) + "$ ";
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function interpretInput(input) {
  if (input.length == 0) {
    return;
  } else {
    const commands = input.split(" ");
    const command = commands[0];
    const args = commands.slice(1, commands.length);

    switch (true) {
      case command == "exit":
        process.exit(0);
      case command == "help":
        console.log("tsh: simple shell written in Typescript");
        break;
      case command == "clear" || command == "reset":
        process.stdout.write("\x1Bc");
        break;
      case command == "cd":
        switchDir(args);
        break;
      case commands.length == 0:
      default:
        await executeProcess(command, args);
        break;
    }
  }
}

async function executeProcess(command: string, args?: string[]) {
  process.stdin.pause();

  const spawnOpts: SpawnOptions = {
    stdio: "inherit",
    env: process.env
  };

  const child =
    args && args.length > 0
      ? spawn(command, args, spawnOpts)
      : spawn(command, spawnOpts);

  await new Promise(resolve => {
    child.on("exit", async exitCode => {
      process.stdin.resume();
      resolve();
    });
    child.on("error", async error => {
      if (error.message.includes("ENOENT")) {
        console.error("command not found: " + command);
      }
      process.stdin.resume();
      resolve();
    });
  });
}

function switchDir(args?: string[]): void {
  // cd into home directory if no args specified
  if (!args || args.length == 0) {
    process.chdir(os.homedir());
    return;
  } else if (args.length > 1) {
    console.error("cd only supports one argument!");
    return;
  }

  // resolve the absolute path
  let dir = args[0];
  dir = dir[0] == "~" ? os.homedir + dir.slice(1, dir.length) : dir
  dir = path.resolve(dir)

  // does the path exist?
  if (fs.existsSync(dir)) {
    // is the path accessible by our user?
    try {
      fs.accessSync(dir, fs.constants.R_OK);
    } catch (err) {
      console.error("Permission denied on path: " + dir);
    }

    // check if path is a direcotory and switch to it
    if (fs.lstatSync(dir).isDirectory()) {
      process.chdir(dir);
    } else {
      console.error(dir + " is not a directory");
    }
  } else {
    console.error(dir + " does not exist!");
  }
}

const main = async () => {
  while (true) {
    await new Promise(resolve =>
      rl.question(prompt(), async input => {
        await interpretInput(input);
        resolve();
      })
    );
  }
};

main();
