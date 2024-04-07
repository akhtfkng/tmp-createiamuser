import {
  IAMClient,
  CreateUserCommand,
  CreateLoginProfileCommand,
  AddUserToGroupCommand,
} from '@aws-sdk/client-iam'
import {
  SecretsManagerClient,
  GetRandomPasswordCommand,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";


export const handler = async(event) => {

  const getbotUserOAuthToken = async() => {
    console.log("start:getbotUserOAuthToken");
    const client = new SecretsManagerClient();
    console.log(process.env.secretName)
    const input = {
      "SecretId": process.env.secretName
    };
    const command = new GetSecretValueCommand(input);
    const response = await client.send(command);
    const secretString = JSON.parse(response.SecretString);
    console.log("end  :getbotUserOAuthToken");
    return secretString.botUserOAuthToken;
  }

  const createPassword = async() => {
    console.log("start:createPassword");
    const client = new SecretsManagerClient();
    const input = {
      PasswordLength: 20,
      ExcludeCharacters: ",./:;?~\"",
    };
    const command = new GetRandomPasswordCommand(input);
    const response = await client.send(command);
    console.log(JSON.stringify(response));
    console.log("end  :createPassword");
    return response.RandomPassword;
  }

  const checkInputValue = async(iamUserName, iamGroupNames, slackMemberId) => {
    if (!iamUserName || iamUserName == "") {
      console.log("iamUserName is invalid");
      return false;
    }
    if (!iamGroupNames || iamGroupNames == "") {
      console.log("iamGroupNames is invalid");
      return false;
    }
    if (!slackMemberId || slackMemberId == "") {
      console.log("slackMemberId is invalid");
      return false;
    }
  }

  const createUser = async(iamUserName) => {
    console.log("start:createUser");
    const client = new IAMClient();
    const input = {
      "UserName": iamUserName,
    };
    const command = new CreateUserCommand(input);
    const response = await client.send(command);
    console.log(JSON.stringify(response));
    console.log("end  :createUser");
    return response;
  }

  const craeteLoginProfile = async(iamUserName, password) => {
    console.log("start:craeteLoginProfile");
    const client = new IAMClient();
    const input = {
      "UserName": iamUserName,
      "Password": password,
      "PasswordResetRequired": true
    };
    const command = new CreateLoginProfileCommand(input);
    const response = await client.send(command);
    console.log(JSON.stringify(response));
    console.log("end  :craeteLoginProfile");
    return response;
  }
  
  const addUserToGroup = async(iamUserName, iamGroupName) => {
    console.log("start:addUserToGroup");
    const client = new IAMClient();
    const input = {
      "GroupName": iamGroupName,
      "UserName": iamUserName,
    };
    const command = new AddUserToGroupCommand(input);
    const response = await client.send(command);
    console.log(JSON.stringify(response));
    console.log("end  :addUserToGroup");
    return response;
  }

  const sendPassword = async(slackToken, slackMemberId, message) => {
    console.log("start:sendMessage");
    const url = "https://slack.com/api/chat.postMessage";
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackToken}`
    };
    const body = JSON.stringify({
      channel: slackMemberId,
      text: message
    });
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });
    console.log(JSON.stringify(response));
    console.log("end  :sendMessage");
    return response;
  }

  const iamUserName = event.iamUserName;
  const iamGroupNames = event.iamGroupNames;
  const slackMemberId = event.slackMemberId;
  const botUserOAuthToken = await getbotUserOAuthToken();
  const password = await createPassword();

  try {
    const checkResult = await checkInputValue(iamUserName, iamGroupNames, slackMemberId);
    if (checkResult == false) {
      return {"result" : "Validation Error"};
    }
    await createUser(iamUserName);
    await craeteLoginProfile(iamUserName, password);
    await iamGroupNames.forEach((iamGroupName) =>{
       addUserToGroup(iamUserName, iamGroupName);
    })
    await sendPassword(botUserOAuthToken, slackMemberId, "パスワードは "+password+" です");
  } catch (e) {
    console.log(e);
    return {"result" : "System Error"};
  }
  return {"result" : "Success"};
};