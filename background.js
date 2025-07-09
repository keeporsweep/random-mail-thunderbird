// Adds a toolbar button which opens a random email from any folder of any account (excluding junk, spam, and trash).

const EXCLUDED_FOLDERS = ["junk", "spam", "trash"];

async function getAllValidMessages() {
  const accounts = await browser.accounts.list();
  let allMessages = [];

  for (const account of accounts) {
    const folders = await getAllFoldersRecursive(account);
    for (const folder of folders) {
      const lowerName = folder.name.toLowerCase();
      if (EXCLUDED_FOLDERS.includes(lowerName)) continue;

      try {
        const messagesList = await browser.messages.list(folder);
        allMessages.push(...messagesList.messages);
      } catch (e) {
        console.warn("Failed to list messages in folder", folder.name, e);
      }
    }
  }
  return allMessages;
}

async function getAllFoldersRecursive(account) {
  const result = [];
  async function recurse(folder) {
    result.push(folder);
    try {
      const children = await browser.folders.getSubFolders(folder);
      for (const child of children) await recurse(child);
    } catch (e) {
      console.warn("Error reading subfolders of", folder.name, e);
    }
  }
  const rootFolders = await browser.folders.getSubFolders(account);
  for (const root of rootFolders) await recurse(root);
  return result;
}

async function openRandomMessage() {
  const messages = await getAllValidMessages();
  if (messages.length === 0) {
    console.log("No messages found in non-excluded folders.");
    return;
  }
  const random = messages[Math.floor(Math.random() * messages.length)];
  const tab = await getCurrentMailTab();
  if (!tab) {
    console.error("Could not find a mail tab.");
    return;
  }
  await browser.mailTabs.setSelectedMessages(tab.id, [random.id]);
}

async function getCurrentMailTab() {
  const tabs = await browser.mailTabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) return tabs[0];
  const allTabs = await browser.mailTabs.query({});
  return allTabs.length > 0 ? allTabs[0] : null;
}

browser.browserAction.onClicked.addListener(() => {
  openRandomMessage().catch(console.error);
});
