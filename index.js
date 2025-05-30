const axios = require('axios');
const fs = require('fs').promises;
const userAgents = require('user-agents');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('---------------------------------------------');
    console.log('WUMP Automation Bot - YetiDAO');
    console.log(`---------------------------------------------${colors.reset}\n`);
  },
  agent: (msg) => console.log(`${colors.white}${msg}${colors.reset}`)
};

const getCommonHeaders = (token, userAgent) => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.5',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json',
  'priority': 'u=1, i',
  'sec-ch-ua': userAgent,
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sec-gpc': '1',
  'Referer': 'https://wump.xyz/',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
});

const userHeaders = (token, userAgent) => ({
  ...getCommonHeaders(token, userAgent),
  'accept': 'application/vnd.pgrst.object+json',
  'accept-profile': 'public',
  'apikey': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo',
  'x-client-info': 'supabase-ssr/0.5.2'
});

const tasksHeaders = (token, userAgent) => ({
  ...getCommonHeaders(token, userAgent),
  'accept-profile': 'public',
  'apikey': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo'
});

async function getUserInfo(token, userAgent) {
  try {
    const authResponse = await axios.put('https://api.wump.xyz/auth/v1/user', {
      data: { current_task: null },
      code_challenge: null,
      code_challenge_method: null
    }, {
      headers: {
        ...getCommonHeaders(token, userAgent),
        'apikey': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNzQ2NjYyMCwiZXhwIjo0ODkzMTQwMjIwLCJyb2xlIjoiYW5vbiJ9.qSJu05pftBJrcqaHfX5HZC_kp_ubEWAd0OmHEkNEpIo',
        'x-client-info': 'supabase-ssr/0.5.2',
        'x-supabase-api-version': '2024-01-01'
      }
    });
    const userId = authResponse.data.id;
    const userResponse = await axios.get(`https://api.wump.xyz/rest/v1/users?select=*&id=eq.${userId}`, {
      headers: userHeaders(token, userAgent)
    });
    return userResponse.data;
  } catch (error) {
    logger.error(`Failed to fetch user info: ${error.message}`);
    return null;
  }
}

async function getTasks(token, userAgent) {
  try {
    const response = await axios.get('https://api.wump.xyz/rest/v1/tasks?select=*', {
      headers: tasksHeaders(token, userAgent)
    });
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch tasks: ${error.message}`);
    return [];
  }
}

async function completeSocialTask(token, taskId, userAgent) {
  try {
    const response = await axios.post('https://api.wump.xyz/functions/v1/api/tasks/social_follow', {
      taskid: taskId
    }, {
      headers: getCommonHeaders(token, userAgent)
    });
    return response.data;
  } catch (error) {
    logger.error(`Failed to complete social task ${taskId}: ${error.message}`);
    return null;
  }
}

async function completeReferralTask(token, taskId, userAgent) {
  try {
    const response = await axios.post('https://api.wump.xyz/functions/v1/api/tasks/referral', {
      taskid: taskId
    }, {
      headers: getCommonHeaders(token, userAgent)
    });
    return response.data;
  } catch (error) {
    logger.error(`Failed to complete referral task ${taskId}: ${error.message}`);
    return null;
  }
}

async function main() {
  logger.banner();

  try {
    const tokensData = await fs.readFile('tokens.txt', 'utf8');
    const tokens = tokensData.split('\n').map(line => line.trim()).filter(line => line);

    for (const token of tokens) {
      logger.step(`Processing token: ${token.slice(0, 20)}...`);

      const userAgent = new userAgents().toString();
      logger.agent(`Using User-Agent: ${userAgent}`);

      logger.loading('Fetching user information...');
      const userInfo = await getUserInfo(token, userAgent);
      if (userInfo) {
        logger.info(`User: ${userInfo.username}`);
        logger.info(`Global Name: ${userInfo.global_name}`);
        logger.wallet(`Total Points: ${userInfo.total_points}`);
      } else {
        logger.error('Skipping token due to user info fetch failure');
        continue;
      }

      logger.loading('Fetching tasks...');
      const tasks = await getTasks(token, userAgent);

      for (const task of tasks) {
        logger.step(`Processing task: ${task.task_description} (${task.points} points)`);
        
        let result;
        if (task.task_type === 'referral') {
          result = await completeReferralTask(token, task.id, userAgent);
        } else {
          result = await completeSocialTask(token, task.id, userAgent);
        }

        if (result && result.success) {
          logger.success(`Completed task: ${task.task_description} - Earned ${result.result.earned} points`);
          logger.info(`Total Points: ${result.result.total_points}`);
        } else {
          logger.error(`Failed to complete task: ${task.task_description}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.success('Finished processing all tasks for this token\n');
    }

    logger.success('All tokens processed successfully!');
  } catch (error) {
    logger.error(`Error: ${error.message}`);
  }
}

main();
