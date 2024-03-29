import { Injectable } from '@angular/core';
import { Message } from '../models/message.class';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { ChannelsService } from './channels.service';
import { Firestore, addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from '@angular/fire/firestore';
import { Reaction } from '../models/reaction.class';
import { formatDate } from '@angular/common';
import { Channel } from '../models/channel.class';
import { User } from '../models/user.class';
import { DMInfo } from '../models/DMInfo.class';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  message = new Message();
  dm_info = new DMInfo();
  chatMessages: Message[] = [];
  threadAnswers: Message[] = [];
  directMessages: any = [];
  answerReactions: any = [];
  messageReactions = [];
  DMReactions = [];
  DMReactions2 = [];
  directMessageReactions = [];

  public thread_subject$: BehaviorSubject<Message> = new BehaviorSubject<Message>(null!);
  public thread_subject_index$: BehaviorSubject<number> = new BehaviorSubject<number>(null!);
  public selectedMessageMainChat$: BehaviorSubject<Message> = new BehaviorSubject<Message>(null!);
  public selectedAnswerThreadChat$: BehaviorSubject<Message> = new BehaviorSubject<Message>(null!);
  public selectedDirectMessage$: BehaviorSubject<Message> = new BehaviorSubject<Message>(null!);
  public dm_user$: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor(
    private dataService: DataService,
    private firestore: Firestore,
    private channelsService: ChannelsService,
  ) { }

  refreshDMChat() {
    let counter = 0;
    const intervalId = setInterval(() => {
      this.dm_user$.next(this.dm_user$.value);
      counter++;
      if (counter === 10) {
        clearInterval(intervalId);
      }
    }, 100);
  }

  async findReaction(dm_user: User, currentUserInfo: User, selectedDirectMessage: Message, reaction: string): Promise<{ available: boolean, docId: string }> {
    const conversationQuery = query(this.getUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId)), where('reaction', '==', reaction));
    const querySnapshot = await getDocs(conversationQuery);
    let available = false;
    let docId: string = '';
    querySnapshot.forEach((doc) => {
      available = true;
      docId = doc.id;
    });
    return {
      'available': available,
      'docId': docId,
    };
  }

  async findMessage(dm_user: User, currentUserInfo: User, selectedDirectMessage: Message): Promise<{ available: boolean, docId: string }> {
    const conversationQuery = query(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), where('universalId', '==', selectedDirectMessage.universalId));
    const querySnapshot = await getDocs(conversationQuery);
    let available = false;
    let docId: string = '';
    querySnapshot.forEach((doc) => {
      available = true;
      docId = doc.id;
    });
    return {
      'available': available,
      'docId': docId,
    };
  }

  async findConversation(dm_user: User, currentUserInfo: User): Promise<{ DMInfo: DMInfo | null, available: boolean, docId: string }> {
    const querySnapshot = await getDocs(query(this.getUsersDMRef(dm_user), where('chatPartnerId', '==', currentUserInfo.id)));
    let dm_info_result: DMInfo | null = null;
    let available = false;
    let docId: string = '';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      dm_info_result = data as DMInfo;
      available = true;
      docId = doc.id
    });
    const result = {
      'DMInfo': dm_info_result,
      'available': available,
      'docId': docId,
    };
    return result;
  }

  async prepareMessageForExistingConversation(dm_user: User, currentUserInfo: any, message: Message) {
    let docRef = await addDoc(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), message.toJSON());
    let universalId = docRef.id;
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON())

    docRef = await addDoc(this.getUsersDMConversationRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId)), message.toJSON());
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), docRef.id), message.toJSON())
  }

  async sendMessageToOwnChat(dm_user: User, currentUserInfo: any, message: Message) {
    let docRef = await addDoc(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), message.toJSON());
    let universalId = docRef.id;
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON());
  }

  async createConversationAndPrepareMessage(dm_user: User, currentUserInfo: any, message: Message) {
    this.dm_info.setChatPartner(currentUserInfo?.name!);
    this.dm_info.setChatPartnerId(currentUserInfo?.id!);
    let docRef = await addDoc(this.getUsersDMRef(dm_user), this.dm_info.toJSON());
    this.dm_info.setDocId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMRef(dm_user, docRef.id), this.dm_info.toJSON());
    docRef = await addDoc(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), message.toJSON());
    let universalId = docRef.id;
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON())
    this.dm_info.setChatPartner(dm_user?.name!);
    this.dm_info.setChatPartnerId(dm_user?.id!);
    docRef = await addDoc(this.getUsersDMRef(currentUserInfo), this.dm_info.toJSON());
    this.dm_info.setDocId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMRef(currentUserInfo, docRef.id), this.dm_info.toJSON());
    docRef = await addDoc(this.getUsersDMConversationRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId)), message.toJSON());
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), docRef.id), message.toJSON())
    this.dataService.update_sidebar$.next(true);
  }

  async createOwnChat(dm_user: User, currentUserInfo: any, message: Message) {
    this.dm_info.setChatPartner(currentUserInfo?.name!);
    this.dm_info.setChatPartnerId(currentUserInfo?.id!);
    let docRef = await addDoc(this.getUsersDMRef(dm_user), this.dm_info.toJSON());
    this.dm_info.setDocId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMRef(dm_user, docRef.id), this.dm_info.toJSON());
    docRef = await addDoc(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), message.toJSON());
    let universalId = docRef.id;
    message.setId(docRef.id);
    message.setUniversalId(universalId);
    await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON());
    this.dataService.update_sidebar$.next(true);
  }

  async pushMessageToUser(message: Message): Promise<void> {
    const dm_user = this.dm_user$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value;
    message.timestamp = formatDate(new Date(), 'dd-MM-yyyy HH:mm:ss', 'en-US');
    message.setCreatorId(currentUserInfo.id);
    if (dm_user && currentUserInfo && ((await this.findConversation(dm_user, currentUserInfo)).available)) {
      if (dm_user.id !== currentUserInfo.id) {
        await this.prepareMessageForExistingConversation(dm_user, currentUserInfo, message);
      } else {
        await this.sendMessageToOwnChat(dm_user, currentUserInfo, message);
      }
    } else if (dm_user && currentUserInfo && (!(await this.findConversation(dm_user, currentUserInfo)).available)) {
      if (dm_user.id !== currentUserInfo.id) {
        await this.createConversationAndPrepareMessage(dm_user, currentUserInfo, message);
      } else {
        await this.createOwnChat(dm_user, currentUserInfo, message);
      }
    } else {
    }
    this.refreshDMChat();
  }

  updateThreadAnswersOfSelectedMessage() {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const thread_subject = this.thread_subject$.value;

    if (selectedChannel && thread_subject) {
      onSnapshot(this.getChannelsMessageColRef(selectedChannel, thread_subject), (snapshot: any) => {
        this.threadAnswers = snapshot.docs.map((doc: any) => doc.data());
      });
    }
  }

  async getReactionsOfDirectMessages() {
    const dm_user = this.dm_user$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value

    if (dm_user && currentUserInfo) {
      for (let i = 0; i < this.directMessages.length; i++) {
        let message = this.directMessages[i];
        if (((await this.findMessage(dm_user, currentUserInfo, message)).docId)) {
          onSnapshot(this.getUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, message)).docId)), (snapshot: any) => {
            this.DMReactions = snapshot.docs.map((doc: any) => doc.data());
            try {
              this.directMessages[i].reactions = this.DMReactions;
            } catch {
            }
          });
        } else {
        }
      }
    }
  }

  getReactionsOfMessages() {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    for (let i = 0; i < this.chatMessages.length; i++) {
      let message = this.chatMessages[i];
      onSnapshot(this.getChannelsMessageReactionColRef(selectedChannel!, message), (snapshot: any) => {
        this.messageReactions = snapshot.docs.map((doc: any) => doc.data());
        try {
          this.chatMessages[i].reactions = this.messageReactions;
        } catch {
        }
      });
    }
  }

  getReactionsOfAnswers() {
    const thread_subject = this.thread_subject$.value;
    const selectedChannel = this.channelsService.selectedChannel$.value;
    if (selectedChannel && thread_subject) {
      for (let i = 0; i < this.threadAnswers.length; i++) {
        let answer = this.threadAnswers[i];
        onSnapshot(this.getChannelsMessageAnswerReactionColRef(selectedChannel, thread_subject, answer), (snapshot: any) => {
          this.answerReactions = snapshot.docs.map((doc: any) => doc.data());
          try {
            this.threadAnswers[i].reactions = this.answerReactions;
          } catch {
          }
        });
      }
    }
  }

  updateChatMessageOfSelectedChannel() {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    onSnapshot(this.channelsService.getChannelsColRef(selectedChannel!), (snapshot: any) => {
      this.chatMessages = snapshot.docs.map((doc: any) => doc.data());
    });
  }

  async updateDirectMessages() {
    const dm_user = this.dm_user$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value;
    if (dm_user && currentUserInfo) {
      onSnapshot(this.getUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId)), (snapshot: any) => {
        this.directMessages = snapshot.docs.map((doc: any) => doc.data());
      });
    }
  }

  refreshThreadSubject() {
    const thread_subject = this.thread_subject$.value;
    if (thread_subject) {
      this.thread_subject$.next(thread_subject);
    }
  }

  checkReactionExistenceOnDirectMessage(reaction: Reaction) {
    let DMReactions: any = this.selectedDirectMessage$.value.reactions;
    const currentUserInfo = this.channelsService.currentUserInfo$.value

    if (DMReactions) {
      for (let i = 0; i < DMReactions.length; i++) {
        if (DMReactions[i].reaction == reaction.reaction) {
          if (DMReactions[i].creator.length > 0) {
            for (let j = 0; j < DMReactions[i].creator.length; j++) {
              let creator = DMReactions[i].creator[j];
              if (creator == currentUserInfo.name) {
                return { exists: true, amount: DMReactions[i].amount, id: DMReactions[i].id, alreadyReacted: true }
              }
            }
            return { exists: true, amount: DMReactions[i].amount, id: DMReactions[i].id, alreadyReacted: false, creator: DMReactions[i].creator }
          } else {
            let creator = DMReactions[i].creator;
            if (creator == currentUserInfo.name) {
              return { exists: true, amount: DMReactions[i].amount, id: DMReactions[i].id, alreadyReacted: true }
            }
            return { exists: true, amount: DMReactions[i].amount, id: DMReactions[i].id, alreadyReacted: false, creator: DMReactions[i].creator }
          }
        }
      }
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    } else {
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    }
  }

  checkReactionExistenceOnMessage(reaction: Reaction) {
    let messageReactions: any = this.selectedMessageMainChat$.value.reactions;
    const currentUserInfo = this.channelsService.currentUserInfo$.value

    if (messageReactions) {
      for (let i = 0; i < messageReactions.length; i++) {
        if (messageReactions[i].reaction == reaction.reaction) {
          if (messageReactions[i].creator.length > 0) {
            for (let j = 0; j < messageReactions[i].creator.length; j++) {
              let creator = messageReactions[i].creator[j];
              if (creator == currentUserInfo.name) {
                return { exists: true, amount: messageReactions[i].amount, id: messageReactions[i].id, alreadyReacted: true }
              }
            }
            return { exists: true, amount: messageReactions[i].amount, id: messageReactions[i].id, alreadyReacted: false, creator: messageReactions[i].creator }
          } else {
            let creator = messageReactions[i].creator;
            if (creator == currentUserInfo.name) {
              return { exists: true, amount: messageReactions[i].amount, id: messageReactions[i].id, alreadyReacted: true }
            }
            return { exists: true, amount: messageReactions[i].amount, id: messageReactions[i].id, alreadyReacted: false, creator: messageReactions[i].creator }
          }
        }
      }
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    } else {
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    }
  }

  checkReactionExistenceOnAnswer(reaction: Reaction) {
    let answerReactions: any = this.selectedAnswerThreadChat$.value.reactions;
    const currentUserInfo = this.channelsService.currentUserInfo$.value

    if (answerReactions) {
      for (let i = 0; i < answerReactions.length; i++) {
        if (answerReactions[i].reaction == reaction.reaction) {
          if (answerReactions[i].creator.length > 0) {
            for (let j = 0; j < answerReactions[i].creator.length; j++) {
              let creator = answerReactions[i].creator[j];
              if (creator == currentUserInfo.name) {
                return { exists: true, amount: answerReactions[i].amount, id: answerReactions[i].id, alreadyReacted: true }
              }
            }
            return { exists: true, amount: answerReactions[i].amount, id: answerReactions[i].id, alreadyReacted: false, creator: answerReactions[i].creator }
          } else {
            let creator = answerReactions[i].creator;
            if (creator == currentUserInfo.name) {
              return { exists: true, amount: answerReactions[i].amount, id: answerReactions[i].id, alreadyReacted: true }
            }
            return { exists: true, amount: answerReactions[i].amount, id: answerReactions[i].id, alreadyReacted: false, creator: answerReactions[i].creator }
          }
        }
      }
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    } else {
      return { exists: false, amount: -1, id: null, alreadyReacted: false };
    }
  }

  sortDirectMessagesByTime() {
    this.directMessages.sort((a: any, b: any) => {
      const timeA = this.parseDate(a.timestamp);
      const timeB = this.parseDate(b.timestamp);
      return timeA - timeB;
    });
  }

  sortChatMessagesByTime() {
    this.chatMessages.sort((a: any, b: any) => {
      const timeA = this.parseDate(a.timestamp);
      const timeB = this.parseDate(b.timestamp);
      return timeA - timeB;
    });
  }

  sortThreadAnswersByTime() {
    this.threadAnswers.sort((a: any, b: any) => {
      const timeA = this.parseDate(a.timestamp);
      const timeB = this.parseDate(b.timestamp);
      return timeA - timeB;
    });
  }

  parseDate(timestamp: any) {
    const dateParts = timestamp.split(' ')[0].split('-');
    const timeParts = timestamp.split(' ')[1].split(':');
    const secondsParts = timeParts[2].split(':');
    const year = parseInt(dateParts[2], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[0], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(secondsParts[0], 10);
    return new Date(year, month, day, hours, minutes, seconds).getTime();
  }

  async increaseReactionAndAddNewCreatorForDM(result: any, dm_user: User, currentUserInfo: any, selectedDirectMessage: Message, reaction: Reaction) {
    if (result.alreadyReacted) {
    } else {
      let creators = result.creator;
      creators.push(currentUserInfo.name);
      reaction.setCreator(creators);
      let reaction_amount = result.amount + 1;
      reaction.setAmount(reaction_amount);
      await updateDoc(this.getUpdatedUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId), result.id), reaction.toJSON());
      await updateDoc(this.getUpdatedUsersDMConversationReactionRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), ((await this.findMessage(currentUserInfo, dm_user, selectedDirectMessage)).docId), ((await this.findReaction(currentUserInfo, dm_user, selectedDirectMessage, reaction.reaction)).docId)), reaction.toJSON());
    }
  }

  async createReactionAndSetCreatorForDM(dm_user: User, currentUserInfo: any, selectedDirectMessage: Message, reaction: Reaction) {
    let creators = [];
    creators.push(currentUserInfo.name);
    reaction.setCreator(creators);
    reaction.setAmount(1);
    let docRef = await addDoc(this.getUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId)), reaction.toJSON());
    reaction.setId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId), docRef.id), reaction.toJSON());
    docRef = await addDoc(this.getUsersDMConversationReactionRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), ((await this.findMessage(currentUserInfo, dm_user, selectedDirectMessage)).docId)), reaction.toJSON());
    reaction.setId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMConversationReactionRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), ((await this.findMessage(currentUserInfo, dm_user, selectedDirectMessage)).docId), docRef.id), reaction.toJSON());
  }

  async createReactioninOwnChat(dm_user: User, currentUserInfo: any, selectedDirectMessage: Message, reaction: Reaction) {
    let creators = [];
    creators.push(currentUserInfo.name);
    reaction.setCreator(creators);
    reaction.setAmount(1);
    let docRef = await addDoc(this.getUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId)), reaction.toJSON());
    reaction.setId(docRef.id);
    await updateDoc(this.getUpdatedUsersDMConversationReactionRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).docId), docRef.id), reaction.toJSON());
  }

  async addReactionToDM(reaction: Reaction) {
    const dm_user = this.dm_user$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value
    const selectedDirectMessage = this.selectedDirectMessage$.value;
    let result = this.checkReactionExistenceOnDirectMessage(reaction);
    if (dm_user && currentUserInfo) {
      if ((await this.findMessage(dm_user, currentUserInfo, selectedDirectMessage)).available && (await this.findMessage(currentUserInfo, dm_user, selectedDirectMessage)).available) {
        if (dm_user?.id !== currentUserInfo.id) {
          if (result.exists) {
            await this.increaseReactionAndAddNewCreatorForDM(result, dm_user, currentUserInfo, selectedDirectMessage, reaction);
          } else {
            await this.createReactionAndSetCreatorForDM(dm_user, currentUserInfo, selectedDirectMessage, reaction);
          }
        } else {
          if (!result.exists) {
            await this.createReactioninOwnChat(dm_user, currentUserInfo, selectedDirectMessage, reaction);
          }
        }
      } else {
        console.error('no message available.');
      }
    } else {
      console.error('No selected channel or selected message available.');
    }
    this.refreshDMChat();
  }

  async increaseReactionAndAddNewCreatorForAnswer(result: any, currentUserInfo: any, thread_subject: Message, selectedChannel: Channel, selectedAnswerThreadChat: Message, reaction: Reaction) {
    if (result.alreadyReacted) {
    } else {
      let creators = result.creator;
      creators.push(currentUserInfo.name);
      reaction.setCreator(creators);
      let reaction_amount = result.amount + 1;
      reaction.setAmount(reaction_amount);
      await updateDoc(this.getUpdateChannelsMessageAnswerReactionColRef(selectedChannel, thread_subject, selectedAnswerThreadChat, result.id), reaction.toJSON());
    }
  }

  async createReactionAndSetCreatorForAnswer(currentUserInfo: any, thread_subject: Message, selectedChannel: Channel, selectedAnswerThreadChat: Message, reaction: Reaction) {
    let creators = [];
    creators.push(currentUserInfo.name);
    reaction.setCreator(creators);
    reaction.setAmount(1);
    const docRef = await addDoc(this.getChannelsMessageAnswerReactionColRef(selectedChannel, thread_subject, selectedAnswerThreadChat), reaction.toJSON());
    reaction.setId(docRef.id);
    await updateDoc(this.getUpdateChannelsMessageAnswerReactionColRef(selectedChannel, thread_subject, selectedAnswerThreadChat, docRef.id), reaction.toJSON());
  }

  async addReactionToAnswer(reaction: Reaction) {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const thread_subject = this.thread_subject$.value;
    const selectedAnswerThreadChat = this.selectedAnswerThreadChat$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value
    let result = this.checkReactionExistenceOnAnswer(reaction);
    if (selectedChannel && thread_subject && selectedAnswerThreadChat) {
      if (result.exists) {
        await this.increaseReactionAndAddNewCreatorForAnswer(result, currentUserInfo, thread_subject, selectedChannel, selectedAnswerThreadChat, reaction);
      } else {
        await this.createReactionAndSetCreatorForAnswer(currentUserInfo, thread_subject, selectedChannel, selectedAnswerThreadChat, reaction);
      }
    } else {
      console.error('No selected channel or selected message available.');
    }
    this.refreshThreadSubject();
  }

  async increaseReactionAndAddNewCreatorForMessage(result: any, currentUserInfo: any, selectedChannel: Channel, selectedMessageMainChat: Message, reaction: Reaction) {
    if (result.alreadyReacted) {
    } else {
      let creators = result.creator;
      creators.push(currentUserInfo.name);
      reaction.setCreator(creators);
      let reaction_amount = result.amount + 1;
      reaction.setAmount(reaction_amount);
      await updateDoc(this.getUpdateChannelsMessageReactionColRef(selectedChannel, selectedMessageMainChat, result.id), reaction.toJSON());
    }
  }

  async createReactionAndSetCreatorForMessage(currentUserInfo: any, selectedChannel: Channel, selectedMessageMainChat: Message, reaction: Reaction) {
    let creators = [];
    creators.push(currentUserInfo.name);
    reaction.setCreator(creators);
    reaction.setAmount(1);
    const docRef = await addDoc(this.getChannelsMessageReactionColRef(selectedChannel, selectedMessageMainChat), reaction.toJSON());
    reaction.setId(docRef.id);
    await updateDoc(this.getUpdateChannelsMessageReactionColRef(selectedChannel, selectedMessageMainChat, docRef.id), reaction.toJSON());
  }

  async addReactionToMessage(reaction: Reaction) {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const selectedMessageMainChat = this.selectedMessageMainChat$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value
    let result = this.checkReactionExistenceOnMessage(reaction);
    if (selectedChannel && selectedMessageMainChat) {
      if (result.exists) {
        await this.increaseReactionAndAddNewCreatorForMessage(result, currentUserInfo, selectedChannel, selectedMessageMainChat, reaction);
      } else {
        await this.createReactionAndSetCreatorForMessage(currentUserInfo, selectedChannel, selectedMessageMainChat, reaction);
      }
    } else {
      console.error('No selected channel or selected message available.');
    }
    this.channelsService.setSelectedChannel(selectedChannel!);
  }

  async pushThreadAnswerToMessage(answer: Message): Promise<void> {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const thread_subject = this.thread_subject$.value;
    answer.timestamp = formatDate(new Date(), 'dd-MM-yyyy HH:mm:ss', 'en-US');
    if (selectedChannel && thread_subject && thread_subject !== undefined) {
      const docRef = await addDoc(this.getChannelsMessageColRef(selectedChannel, thread_subject), answer.toJSON());
      answer.setId(docRef.id);
      await updateDoc(this.getUpdateChannelsMessageColRef(selectedChannel, thread_subject, docRef.id), answer.toJSON());
    } else {
      console.error('No selected channel or thread subject available.');
    }
  }

  async pushMessageToChannel(message: Message): Promise<void> {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    message.timestamp = formatDate(new Date(), 'dd-MM-yyyy HH:mm:ss', 'en-US');
    if (selectedChannel) {
      const docRef = await addDoc(this.channelsService.getChannelsColRef(selectedChannel), message.toJSON());
      message.setId(docRef.id);
      await updateDoc(this.channelsService.getUpdatedChannelsColRef(selectedChannel, docRef.id), message.toJSON());
    } else {
      console.error('No selected channel available.');
    }
    this.channelsService.setSelectedChannel(selectedChannel!);
  }

  async increaseAnswerAndSetLatestAnswer(thread_subject: Message, answer: Message) {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    if (selectedChannel) {
      this.message.timestamp = thread_subject.timestamp;
      this.message.message = thread_subject.message;
      this.message.id = thread_subject.id;
      this.message.creator = thread_subject.creator;
      this.message.creatorId = thread_subject.creatorId;
      this.message.avatar = thread_subject.avatar;
      this.message.reactions = thread_subject.reactions;
      this.message.answered_number = (thread_subject.answered_number + 1);
      this.message.setLatestAnswer(answer.timestamp);
      await updateDoc(this.channelsService.getUpdatedChannelsColRef(selectedChannel, thread_subject.id), this.message.toJSON());
    }
  }

  async updateMessage(message: Message) {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const docRef = this.thread_subject$.value;
    await updateDoc(this.channelsService.getUpdatedChannelsColRef(selectedChannel!, docRef.id), message.toJSON());
    this.channelsService.setSelectedChannel(selectedChannel!);
  }

  async updateAnswer(message: Message, docRef: Message) {
    const selectedChannel = this.channelsService.selectedChannel$.value;
    const thread_subject = this.thread_subject$.value;
    await updateDoc(this.getUpdateChannelsMessageColRef(selectedChannel!, thread_subject, docRef.id), message.toJSON());
    this.refreshThreadSubject();
  }

  async updateDirectMessage(message: Message, docRef: Message) {
    const dm_user = this.dm_user$.value;
    const currentUserInfo = this.channelsService.currentUserInfo$.value;
    const selectedDirectMessage = this.selectedDirectMessage$.value;
    if (dm_user && currentUserInfo) {
      if (dm_user.id !== currentUserInfo.id) {
        await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON());
        await updateDoc(this.getUpdatedUsersDMConversationRef(currentUserInfo, ((await this.findConversation(currentUserInfo, dm_user)).docId), ((await this.findMessage(currentUserInfo, dm_user, selectedDirectMessage)).docId)), message.toJSON());
      } else {
        await updateDoc(this.getUpdatedUsersDMConversationRef(dm_user, ((await this.findConversation(dm_user, currentUserInfo)).docId), docRef.id), message.toJSON());
      }
    }
    this.refreshDMChat();
  }

  getUsersRef() {
    return collection(this.firestore, 'users');
  }

  getUsersDMRef(dm_user: User) {
    return collection(this.firestore, `users/${dm_user.id}/directmessages`);
  }

  getUsersDMInfoRef(dm_user: User, docId: string) {
    return collection(this.firestore, `users/${dm_user.id}/directmessages/${docId}`);
  }

  getUsersDMConversationRef(dm_user: User, docId: string) {
    return collection(this.firestore, `users/${dm_user.id}/directmessages/${docId}/messages`);
  }

  getUsersDMConversationReactionRef(dm_user: User, docId: string, messageId: string) {
    return collection(this.firestore, `users/${dm_user.id}/directmessages/${docId}/messages/${messageId}/reactions`);
  }

  getUpdatedUsersDMConversationReactionRef(dm_user: User, docId: string, messageId: string, reactionId: string) {
    return doc(this.firestore, `users/${dm_user.id}/directmessages/${docId}/messages/${messageId}/reactions/${reactionId}`);
  }

  getUpdatedUsersDMConversationRef(dm_user: User, docId: string, messageId: string) {
    return doc(this.firestore, `users/${dm_user.id}/directmessages/${docId}/messages/${messageId}`);
  }

  getUpdatedUsersDMRef(dm_user: User, docId: string) {
    return doc(this.firestore, `users/${dm_user.id}/directmessages/${docId}`);
  }

  getUpdateChannelsMessageColRef(selectedChannel: Channel, thread_subject: Message, id: string) {
    return doc(this.firestore, `channels/${selectedChannel.id}/messages/${thread_subject.id}/answers/${id}`);
  }

  getUpdateChannelsMessageReactionColRef(selectedChannel: Channel, selectedMessageMainChat: Message, id: string) {
    return doc(this.firestore, `channels/${selectedChannel.id}/messages/${selectedMessageMainChat.id}/reactions/${id}`);
  }

  getUpdateChannelsMessageAnswerReactionColRef(selectedChannel: Channel, thread_subject: Message, selectedAnswerThreadChat: Message, id: string) {
    return doc(this.firestore, `channels/${selectedChannel.id}/messages/${thread_subject.id}/answers/${selectedAnswerThreadChat.id}/reactions/${id}`);
  }

  getChannelsMessageColRef(selectedChannel: Channel, thread_subject: Message) {
    return collection(this.firestore, `channels/${selectedChannel.id}/messages/${thread_subject.id}/answers`);
  }

  getChannelsMessageReactionColRef(selectedChannel: Channel, selectedMessageMainChat: Message) {
    return collection(this.firestore, `channels/${selectedChannel.id}/messages/${selectedMessageMainChat.id}/reactions`);
  }

  getChannelsMessageAnswerReactionColRef(selectedChannel: Channel, thread_subject: Message, selectedAnswerThreadChat: Message) {
    return collection(this.firestore, `channels/${selectedChannel.id}/messages/${thread_subject.id}/answers/${selectedAnswerThreadChat.id}/reactions`);
  }
}
