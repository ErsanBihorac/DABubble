import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Channel } from 'src/app/models/channel.class';
import { User } from 'src/app/models/user.class';
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { DataService } from 'src/app/shared-services/data.service';
import { OpenDialogService } from 'src/app/shared-services/open-dialog.service';
import { UserService } from 'src/app/shared-services/user.service';
import { MessagesService } from 'src/app/shared-services/messages.service';
import { user } from '@angular/fire/auth';
@Component({
  selector: 'app-main-content-side-bar',
  templateUrl: './main-content-side-bar.component.html',
  styleUrls: ['./main-content-side-bar.component.scss']
})
export class MainContentSideBarComponent {
  channel_icon: string = 'arrow_drop_down';
  channels_opened: boolean = true;
  directmessage_icon: string = 'arrow_drop_down';
  directmessages_opened: boolean = true;

  mobile: boolean = false;


  channels: Channel[] = [];
  currentUser!: User;
  users: any[] = [];
  usersWithConversation: any[] = [];

  private destroyed$ = new Subject<void>();

  constructor(private dialogService: OpenDialogService,
    private channelsService: ChannelsService,
    private dataService: DataService,
    private userService: UserService,
    private messagesService: MessagesService) {

    this.channelsService.currentUserInfo$.pipe(takeUntil(this.destroyed$)).subscribe((currentUser) => {
      this.currentUser = currentUser;
    });

    this.channelsService.channels$.pipe(takeUntil(this.destroyed$)).subscribe(channels => {
      this.channels = channels;
    });

    this.userService.users$.pipe(takeUntil(this.destroyed$)).subscribe((users) => {
      this.users = users;
      this.checkConversations();
    })

    this.dataService.mobile$.subscribe((value: boolean) => {
      this.mobile = value;
    });

    this.dataService.update_sidebar$.subscribe((value: boolean) => {
      if (value) {
        this.checkConversations();
      }
    })
  }

  async checkConversations() {
    const currentUserInfo = this.channelsService.currentUserInfo$.value;
    let users = this.users;
    this.usersWithConversation = [];

    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      const dm_user = user;
      if ((await this.messagesService.findConversation(dm_user, currentUserInfo)).available) {
        this.usersWithConversation.push(user)
      }
    }
  }

  openNewMessageInput() {
    this.dataService.new_message_open$.next(true);
    this.dataService.thread_open$.next(false);
    this.dataService.directmessage_open$.next(false);
  }

  sortChannels() {
    this.channels.sort((a: any, b: any) => {
      const timeA = this.parseDate(a.timestamp);
      const timeB = this.parseDate(b.timestamp);
      return timeB - timeA;
    });
  }

  parseDate(timestamp: any) {
    const dateParts = timestamp.split(' ')[0].split('-');
    const timeParts = timestamp.split(' ')[1].split(':');

    const year = parseInt(dateParts[2], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Monate in JavaScript sind 0-basiert
    const day = parseInt(dateParts[0], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    return new Date(year, month, day, hours, minutes).getTime();
  }

  openDM(user: User) {
    if (this.mobile) {
      this.dataService.directmessage_open$.next(true);
      this.dataService.thread_open$.next(false);
      this.dataService.new_message_open$.next(false);
      this.dataService.workspace_header_open$.next(true);
      let counter = 0;

      const intervalId = setInterval(() => {
        this.messagesService.dm_user$.next(user);
        counter++;

        if (counter === 10) {
          clearInterval(intervalId); // Stoppt das Intervall, nachdem es fünf aufgerufen wurde
        }
      }, 100);
    } else {
      this.dataService.directmessage_open$.next(true);
      this.dataService.thread_open$.next(false);
      this.dataService.new_message_open$.next(false);
      let counter = 0;

      const intervalId = setInterval(() => {
        this.messagesService.dm_user$.next(user);
        counter++;

        if (counter === 10) {
          clearInterval(intervalId); // Stoppt das Intervall, nachdem es fünf aufgerufen wurde
        }
      }, 100);
    }
  }

  openChannel(channel: Channel): void {
    if (this.channelsService.isCurrentUserChannelMember(channel)) {
      if (this.mobile) {
        this.dataService.mainchat_mobile_open$.next(true);
        this.dataService.workspace_header_open$.next(true);
        this.dataService.directmessage_open$.next(false);
        this.dataService.thread_open$.next(false);
        this.dataService.new_message_open$.next(false);
        let counter = 0;

        const intervalId = setInterval(() => {
          this.channelsService.setSelectedChannel(channel);
          counter++;

          if (counter === 5) {
            clearInterval(intervalId); // Stoppt das Intervall, nachdem es fünf aufgerufen wurde
          }
        }, 100);
      } else {
        this.dataService.directmessage_open$.next(false);
        this.dataService.thread_open$.next(false);
        this.dataService.new_message_open$.next(false);
        let counter = 0;

        const intervalId = setInterval(() => {
          this.channelsService.setSelectedChannel(channel);
          counter++;

          if (counter === 5) {
            clearInterval(intervalId); // Stoppt das Intervall, nachdem es fünf aufgerufen wurde
          }
        }, 100);
      }
    } else {

    }
  }

  openDialog(componentKey: string): void {
    this.dialogService.setNeedToAddMoreMembers(false);
    this.dialogService.openDialog(componentKey);
  }

  toggleChannels() {
    this.channels_opened = !this.channels_opened;

    if (!this.channels_opened) {
      this.channel_icon = 'arrow_right'
    } else {
      this.channel_icon = 'arrow_drop_down'
    }
  }

  toggleDM() {
    this.directmessages_opened = !this.directmessages_opened;

    if (!this.directmessages_opened) {
      this.directmessage_icon = 'arrow_right'
    } else {
      this.directmessage_icon = 'arrow_drop_down'
    }
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

}
