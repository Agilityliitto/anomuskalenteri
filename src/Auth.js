import React from 'react';
import { apiUrl } from "./config"
import "./Auth.css";

async function authenticate(username, password) {
    const response = await fetch(`${apiUrl}authenticate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password }),
    })
    if (!response.ok) {
        throw new Error("AuthFail");
    }
    const { id_token } = await response.json();
    return id_token;
}

export default class AuthForm extends React.Component {
    state = {
        username: "",
        password: "",
        error: false,
        loading: false
    };

    handleUsername = (event) => {
        this.setState({
            username: event.target.value
        });
    }
    handlePassword = (event) => {
        this.setState({
            password: event.target.value
        });
    }
    doAuth = async () => {
        this.setState({ loading: true })
        try {
            const idToken = await authenticate(this.state.username, this.state.password);
            this.props.onAuth(idToken);
        } catch (e) {
            this.setState(prevState => ({ ...prevState, error: true }));
            this.setState({ loading: false })
        }
    }
    render() {
        return (<div className={this.state.error ? "auth error" : "auth"}>
            <div className="logo">Logo</div>
            <label>Käyttäjätunnus: <input name="username" onChange={this.handleUsername} value={this.state.username}></input></label>
            <label>Salasana: <input type="password" name="password" onChange={this.handlePassword} value={this.state.password}></input></label>
            <button onClick={this.doAuth} disabled={this.state.loading}>Kirjaudu</button>
        </div>);
    }
}