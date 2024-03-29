/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
    
/**
 *
 */
function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c==='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

/**
  * Remove an item from arra
  * @param {Array} array
  * @param {Object} elem
  */
function removeElement(array, elem) {
    var index = array.indexOf(elem);
    if (index > -1) {
        array.splice(index, 1);
    }
}

/**
 * Send message to a chat
 * @param {org.miluxas.BlockchainBase.SendMessageToChat} sendMessageToChat
 * @transaction
 */
async function sendMessageToChat(tx){
    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    let chat=tx.chat;
    chat.messageList.push(tx.message);
    await chatAssetRegistry.update(chat);
}

/**
 * StartNewPeerChat transaction
 * @param {org.miluxas.BlockchainBase.StartNewPeerChat} startNewPeerChat
 * @transaction
 */
async function startNewPeerChat(tx) {
    const factory = getFactory();
    const namespace = 'org.miluxas.BlockchainBase';

    // load the chat network.
    const chatNetAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.ChatNet');
    const mainChatNet=await chatNetAssetRegistry.get('mainchatnetid001');

    // create a chat.
    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    const newChat = factory.newResource(namespace, 'Chat', tx.newChatId);
    newChat.title = tx.newChatTitle;
    newChat.createAt=new Date();
    newChat.type='PEER';
    newChat.memberList=[];
    newChat.messageList=[];

    // create new member as owner.
    const memberAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Member');
    const adminMember = factory.newResource(namespace,'Member',create_UUID());
    adminMember.type='OWNER';
    adminMember.addedAt=new Date();
    adminMember.status='NORMAL';
    adminMember.user=factory.newRelationship(namespace, 'User', getCurrentParticipant().getIdentifier());
    await memberAssetRegistry.add(adminMember);
    newChat.memberList.push(adminMember);

    // create new member as peer.
    const peerMember = factory.newResource(namespace,'Member',create_UUID());
    peerMember.type='NORMAL';
    peerMember.addedAt=new Date();
    peerMember.status='NORMAL';
    peerMember.user=factory.newRelationship(namespace, 'User', tx.peerUser.getIdentifier());
    await memberAssetRegistry.add(peerMember);
    newChat.memberList.push(peerMember);

    await chatAssetRegistry.add(newChat).catch(er=>{
        console.log(er);
    });

    // add chat to chat network.
    mainChatNet.chatList.push(newChat);
    await chatNetAssetRegistry.update(mainChatNet);


    // Emit an event created admin and added to new chat.
    let event = getFactory().newEvent('org.miluxas.BlockchainBase', 'NewMemberAddedToChat');
    event.chat = newChat;
    event.newMember = adminMember;
    emit(event);

    // Emit an event created new user and added to new chat.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'NewMemberAddedToChat');
    event2.chat = newChat;
    event2.newMember = peerMember;
    event2.adderMember = adminMember;
    emit(event2);
}

/**
 * StartNewGroupChat transaction
 * @param {org.miluxas.BlockchainBase.StartNewGroupChat} startNewGroupChat
 * @transaction
 */
async function startNewGroupChat(tx) {
    const factory = getFactory();
    const namespace = 'org.miluxas.BlockchainBase';

    // load the chat network.
    const chatNetAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.ChatNet');
    const mainChatNet=await chatNetAssetRegistry.get('mainchatnetid001');

    // create a chat.
    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    const newChat = factory.newResource(namespace, 'Chat', tx.newChatId);
    newChat.title = tx.newChatTitle;
    newChat.createAt=new Date();
    newChat.type=tx.type;
    newChat.memberList=[];
    newChat.messageList=[];

    // create new member as owner.
    const memberAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Member');
    const adminMember = factory.newResource(namespace,'Member',create_UUID());
    adminMember.type='OWNER';
    adminMember.addedAt=new Date();
    adminMember.status='NORMAL';
    adminMember.user=factory.newRelationship(namespace, 'User', getCurrentParticipant().getIdentifier());
    await memberAssetRegistry.add(adminMember);
    newChat.memberList.push(adminMember);
    //console.log(newChat.memberList);
    await chatAssetRegistry.add(newChat).catch(er=>{
        console.log(er);
    });

    // add chat to chat network.
    mainChatNet.chatList.push(newChat);
    await chatNetAssetRegistry.update(mainChatNet);

    // Emit an event created admin and added to new chat.
    let event = getFactory().newEvent('org.miluxas.BlockchainBase', 'NewMemberAddedToChat');
    event.chat = newChat;
    event.newMember = adminMember;
    emit(event);
}

/**
 * Send join to chat request
 * @param {org.miluxas.BlockchainBase.JoinToChat} joinToChat
 * @transaction
 */
async function joinToChat(tx){
    const factory = getFactory();
    const namespace = 'org.miluxas.BlockchainBase';
    // create new member.
    const memberAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Member');
    const newMember = factory.newResource(namespace,'Member',create_UUID());
    newMember.type='NORMAL';
    newMember.addedAt=new Date();
    if(tx.chat.type==='PUBLIC_GROUP' || tx.chat.type==='PUBLIC_CANNAL'){
        newMember.status='NORMAL';
    }
    if(tx.chat.type==='PRIVATE_GROUP' || tx.chat.type==='PRIVATE_CANNAL'){
        newMember.status='REQUESTED';
    }
    newMember.user=factory.newRelationship(namespace, 'User', getCurrentParticipant().getIdentifier());
    await memberAssetRegistry.add(newMember);

    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    let chat=tx.chat;
    chat.memberList.push(newMember);
    await chatAssetRegistry.update(chat);

    // Emit an event created admin and added to new chat.
    let event = getFactory().newEvent('org.miluxas.BlockchainBase', 'NewMemberAddedToChat');
    event.chat = chat;
    event.newMember = newMember;
    emit(event);
}

/**
 * Add other user to a chat
 * @param {org.miluxas.BlockchainBase.AddOtherUserToChat} addOtherUserToChat
 * @transaction
 */
async function addOtherUserToChat(tx){
    const factory = getFactory();
    const namespace = 'org.miluxas.BlockchainBase';
    // create new member.
    const memberAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Member');
    const newMember = factory.newResource(namespace,'Member',create_UUID());
    newMember.type='NORMAL';
    newMember.addedAt=new Date();
    newMember.status='NORMAL';

    newMember.user=factory.newRelationship(namespace, 'User', tx.otherUser.getIdentifier());
    await memberAssetRegistry.add(newMember);

    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    let chat=tx.chat;
    chat.memberList.push(newMember);
    await chatAssetRegistry.update(chat);

    let findedMember = tx.chat.memberList.find(m=>{return m.user.getIdentifier()===getCurrentParticipant().getIdentifier();});

    // Emit an event created new user and added to new chat.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'NewMemberAddedToChat');
    event2.chat = chat;
    event2.newMember = newMember;
    event2.adderMember = findedMember;
    emit(event2);
}

/**
 * Expel a member from chat
 * @param {org.miluxas.BlockchainBase.ExpelMemberFromChat} expelMemberFromChat
 * @transaction
 */
async function expelMemberFromChat(tx){
    tx.member.status='EXPELED';
    const memberRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    await memberRegistry.update(tx.chat);

    // Emit an event expel user from chat.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'MemberExpeledFromChat');
    event2.chat = tx.chat;
    event2.member = tx.member;
    emit(event2);
}

/**
 * Block a member from chat
 * @param {org.miluxas.BlockchainBase.BlockMember} blockMember
 * @transaction
 */
async function blockMember(tx){
    tx.member.status='BLOCKED';
    const memberRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    await memberRegistry.update(tx.chat);

    // Emit an event block user in chat.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'MemberBlockedInChat');
    event2.chat = tx.chat;
    event2.member = tx.member;
    emit(event2);
}

/**
 * Block a member from chat
 * @param {org.miluxas.BlockchainBase.LeaveChat} leaveChat
 * @transaction
 */
async function leaveChat(tx){
    // Find user in chat members
    let findedMember = tx.chat.memberList.find(m=>{return m.user.getIdentifier()===getCurrentParticipant().getIdentifier();});
    findedMember.status='LEFT';
    const chatRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    await chatRegistry.update(tx.chat);

    // Emit an event member left chat.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'MemberLeftChat');
    event2.chat = tx.chat;
    event2.member = tx.member;
    emit(event2);
}

/**
 * Block a member from chat
 * @param {org.miluxas.BlockchainBase.DeleteMessage} deleteMessage
 * @transaction
 */
async function deleteMessage(tx){
    const chatAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Chat');
    let chat=tx.chat;
    // Remove message from chat message list
    removeElement(chat.messageList,tx.message);
    //chat.messageList.remove(tx.message);
    await chatAssetRegistry.update(chat);
    // Remove the message asset.
    const messageAssetRegistry = await getAssetRegistry('org.miluxas.BlockchainBase.Message');
    await messageAssetRegistry.remove(tx.message);

    let findedMember = chat.memberList.find(m=>{return m.user.getIdentifier()===getCurrentParticipant().getIdentifier();});

    // Emit an event a message deleted.
    let event2 = getFactory().newEvent('org.miluxas.BlockchainBase', 'MessageDeleted');
    event2.chat = tx.chat;
    event2.message = tx.message;
    event2.member = findedMember;
    emit(event2);
}


