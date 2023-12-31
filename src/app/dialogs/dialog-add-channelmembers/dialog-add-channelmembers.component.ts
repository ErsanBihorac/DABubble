import { Component } from '@angular/core';
import { ChannelsService } from 'src/app/shared-services/channels.service';
import { Channel } from 'src/app/models/channel.class';
import { User } from 'src/app/models/user.class';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { UserService } from 'src/app/shared-services/user.service';
import { OpenDialogService } from 'src/app/shared-services/open-dialog.service';

@Component({
  selector: 'app-dialog-add-channelmembers',
  templateUrl: './dialog-add-channelmembers.component.html',
  styleUrls: ['./dialog-add-channelmembers.component.scss',
    '../dialog-show-profile/dialog-show-profile.component.scss',
    '../dialog-edit-profile/dialog-edit-profile.component.scss']
})
export class DialogAddChannelmembersComponent {
  selection = ['Alle Mitglieder von OfficeTeam hinzufügen', 'Bestimmte Leute hinzufügen'];
  selectedOption: 'allMembers' | 'specificMembers' = 'allMembers';
  specificMemberInput: string = '';

  filteredUsers: User[] = [];
  selectedUsers: User[] = [];

  needToAddMoreMembers: boolean = false;
  needToAddMoreMembersSubscription: Subscription
  channel: Channel | null = null;
  selectedChannelSubscription: Subscription;
  users: User[] = [];
  userSubscription: Subscription;

  constructor(private channelsService: ChannelsService, private dialogService: OpenDialogService, private userService: UserService, private dialogRef: MatDialogRef<DialogAddChannelmembersComponent>) {
    this.selectedChannelSubscription = this.channelsService.selectedChannel$.subscribe((channel) => {
      this.channel = channel;
    });
    this.userSubscription = this.userService.users$.subscribe((users) => {
      this.users = users;
    });
    this.needToAddMoreMembersSubscription = this.dialogService.needToAddMoreMembers$.subscribe((state) => {
      this.needToAddMoreMembers = state;
      console.log('zweiter member dialog geöffnet', state)
    })
  }

  onInput() {
    this.filterUsers();
  }

  filterUsers() {
    if (this.channel) {
      const channelMembers = this.needToAddMoreMembers ? (this.channel.members || []) : [];
           
      this.filteredUsers = this.users.filter(user => {
        const userIncluded = channelMembers.some(channelUser => channelUser.id === user.id);
       
        return (
          user.name.toLowerCase().includes(this.specificMemberInput.toLowerCase()) &&
          !this.selectedUsers.includes(user) &&
          (this.needToAddMoreMembers ? !userIncluded : true)
        );
      });
    } else {
      this.filteredUsers = this.users.filter(user =>
        user.name.toLowerCase().includes(this.specificMemberInput.toLowerCase()) &&
        !this.selectedUsers.includes(user)
      );
    }
  }
  
  selectUser(user: User) {
    this.selectedUsers.push(user);
    this.specificMemberInput = '';
    this.filterUsers();
  }

  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter(u => u !== user);
    this.filterUsers();
  }

  addChannelMembers() {
    if (this.channel && !this.needToAddMoreMembers) {
      if (this.selectedOption === 'allMembers') {
        const usersData = this.users.map(user => user.toJSON());
        this.channel.members = this.channel.members.concat(usersData);
      } else if (this.selectedOption === 'specificMembers') {
        const selectedUsersData = this.selectedUsers.map(user => user.toJSON());
        this.channel.members = this.channel.members.concat(selectedUsersData);
      }
    } else if (this.channel && this.needToAddMoreMembers) {
      const selectedUsersData = this.selectedUsers.map(user => user.toJSON());
      this.channel.members = this.channel.members.concat(selectedUsersData);
    }
  
    if (this.channel) {
      this.channelsService.setSelectedChannel(this.channel);
      this.channelsService.updateChannel(this.channel);
      this.dialogRef.close();
      this.dialogService.setNeedToAddMoreMembers(false);
    }
  }
  

  ngOnDestroy(): void {
    this.selectedChannelSubscription.unsubscribe();
    this.userSubscription.unsubscribe();
  }
}
