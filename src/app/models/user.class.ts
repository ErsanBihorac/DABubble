export class User {
    id: string;
    name: string;
    password: string;
    confirmPassword: string;
    email: string;
    avatar: string;
    onlineStatus: boolean = false;

    constructor(obj?: any) {
        this.id = obj ? obj.id : '';
        this.name = obj ? obj.name : '';
        this.password = obj ? obj.password : '';
        this.confirmPassword = obj ? obj.confirmPassword : '';
        this.email = obj ? obj.email : '';
        this.avatar = obj ? obj.avatar : '';
        this.onlineStatus = obj ? obj.onlineStatus : '';
    }

    public toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            avatar: this.avatar,
            onlineStatus: this.onlineStatus
        }
    }
}