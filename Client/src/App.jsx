import "./App.css";

import SingleCard from "./components/SingleCard";
import { useState, useEffect, useContext } from "react";
import { TextInput } from "flowbite-react";
import { ThemeContext } from "./contexts/ThemeContext";
import { useSocket } from "./hooks/useSocket";


export default function App() {
  const [cards, setCards] = useState([]);
  const [turns, setTurns] = useState(0);
  const [choiceOne, setChoiceOne] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [choiceTwo, setChoiceTwo] = useState(null);
  const [disabled, setDisabled] = useState(false);

  const [userName, setUserName] = useState("");
  const [isUserSet, setIsUserSet] = useState(false);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sen, setSen] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState(null);

  const [gameStarted, setGameStarted] = useState(false);

  const { theme, currentTheme, changeTheme } = useContext(ThemeContext);

  const socket = useSocket();

  const handleChoice = (card) => {
    if (disabled || card.flipped || card.matched || currentPlayer !== socket.id)
      return;
    socket.emit("flip-card", card.id);
  };

  useEffect(() => {
    const scrollToBottom = () => {
      const chatContainer = document.querySelector(".chat-container");
      chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const resetTurn = () => {
      setChoiceOne(null);
      setChoiceTwo(null);
      setTurns((prevTurns) => prevTurns + 1);
      setDisabled(false);
    };

    if (socket) {
      socket.on("messages", (data) => {
        setMessages(data);
        scrollToBottom();
      });

      socket.on("game-board-created", (cards) => {
        setCards(cards);
        setTurns(0);
        setChoiceOne(null);
        setChoiceTwo(null);
        setGameStarted(true);
      });

      socket.on("user-joined", (userName, players) => {
        setPlayers(players);
      });

      socket.on("user-left", (userName, players) => {
        setPlayers(players);
      });

      socket.on("message", (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        scrollToBottom();
      });

      socket.on("card-flipped", (card) => {
        setCards((prevCards) =>
          prevCards.map((c) => (c.id === card.id ? card : c))
        );
        if (!choiceOne) {
          setChoiceOne(card);
        } else {
          setChoiceTwo(card);
        }
      });

      socket.on("cards-matched", (cards) => {
        setCards((prevCards) =>
          prevCards.map((card) =>
            cards.find((c) => c.id === card.id)
              ? { ...card, matched: true }
              : card
          )
        );
        resetTurn();
      });

      socket.on("cards-unmatched", (cards) => {
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((card) =>
              cards.find((c) => c.id === card.id)
                ? { ...card, flipped: false }
                : card
            )
          );
          resetTurn();
        }, 1000);
      });

      socket.on("update-turn", (playerId) => {
        setCurrentPlayer(playerId);
      });
    }

    return () => {
      if (socket) {
        socket.off("messages");
        socket.off("game-board-created");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("message");
        socket.off("card-flipped");
        socket.off("cards-matched");
        socket.off("cards-unmatched");
        socket.off("update-turn");
      }
    };
  }, [socket, choiceOne]);

  useEffect(() => {
    if (isUserSet && currentRoom) {
      socket?.emit("Join-Room", currentRoom);
    }
  }, [isUserSet, currentRoom, socket]);

  const handleFormSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem("user", userName);
    setIsUserSet(true);
    socket?.emit("Set-Nick", userName);
  };

  const handleSendMessage = () => {
    if (!sen.trim()) return;
    const body = {
      sender: localStorage.getItem("user"),
      text: sen,
    };

    socket.emit("messages:post", body);
    setSen("");
  };

  const startGame = () => {
    socket.emit("generate-shuffled-card", currentRoom);
  };

  const handleRoomChange = (room) => {
    setCurrentRoom(room);
    setMessages([]);
    setGameStarted(false);
  };


  return (
    <>
      <div
        className={`App flex w-full h-full px-20 py-5 ${theme[currentTheme].bgColor}`}
      >
        <div className={`card-container w-3/4 ${(!gameStarted) ? "me-0" : "me-10"}`}>
          <div className="flex justify-between gap-4 mt-6">
            <h3
              className={`text-2xl font-semibold ${theme[currentTheme].colorTextPrimary}`}
            >
              Memory Battle
            </h3>
            <label className="inline-flex items-center cursor-pointer">
              <i className={`bx bxs-sun me-2 text-xl ${theme[currentTheme].colorTextPrimary}`}></i>
              <input type="checkbox" className="sr-only peer" onClick={changeTheme} checked={currentTheme === "dark" ? "true" : ""} />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              <i className={`bx bxs-moon ms-2 text-lg ${theme[currentTheme].colorTextPrimary}`}></i>
            </label>
          </div>
          <button
            className={`rounded-lg mt-6 cursor-pointer bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton} ${!gameStarted && "hidden"}`}
            onClick={startGame}
          >
            Reset Game
          </button>
          {!isUserSet ? (
            <form
              className="flex flex-col gap-4 mt-6 justify-center w-full"
              onSubmit={handleFormSubmit}
            >
              <div>
                <TextInput
                  id="name"
                  type="text"
                  placeholder="your name"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  required
                />
              </div>
              <button className=" bg-pink-700 hover:bg-pink-800" type="submit">
                Submit
              </button>
            </form>
          ) : (
            <>
              <h1 className={`mt-8 text-xl font-semibold ${theme[currentTheme].colorTextPrimary} ${gameStarted && "hidden"}`}>Available Rooms</h1>
              {!gameStarted && (
                <div className="flex mt-5 gap-5 me-0">
                  <div className="flex flex-col gap-4 w-1/2">
                    <button
                      className={`py-2 px-4 h-fit rounded-lg cursor-pointer  bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton}`}
                      onClick={() => handleRoomChange("room_1")}
                    >
                      Room 1
                    </button>
                    <button
                      className={`py-2 px-4 h-fit rounded-lg cursor-pointer bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton}`}
                      onClick={() => handleRoomChange("room_2")}
                    >
                      Room 2
                    </button>
                  </div>

                  {/* --- ROOM 1 --- */}
                  <div className={`w-3/4 p-4 border-gray-200 rounded-lg shadow sm:p-6 dark:bg-gray-800 dark:border-gray-700 ${theme[currentTheme].bgColorCardRoom}`}>
                    <div className="flex justify-between align-middle">
                      {currentRoom !== "" ?
                        <h2 className={`h-fit text-xl font-semibold ${theme[currentTheme].colorTextPrimary}`}>
                          {currentRoom !== "" && currentRoom === "room_1" ? "Room 1" : "Room 2"}
                        </h2>
                        :
                        <p>Join any available rooms to start the battle!</p>
                      }
                    </div>
                    <ul className="my-4 space-y-3">
                      {players.map((player, index) => (
                        <li key={player.id} className={`flex items-center p-3 text-base font-bold text-gray-900 rounded-lg hover:bg-gray-100 group hover:shadow dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white ${theme[currentTheme].bgColorListPlayer} ${theme[currentTheme].hoverCardRoom}`}>
                          <i className={`bx bxs-user ${theme[currentTheme].colorTextPrimary}`}></i>
                          <span className={`flex-1 ms-3 whitespace-nowrap ${theme[currentTheme].colorTextPrimary}`}>{player.name}</span>
                          <span className={`inline-flex items-center justify-center px-2 py-1 ms-3 text-xs font-medium bg-gray-200 rounded dark:bg-gray-700 dark:text-gray-400 text-amber-400 ${index !== 0 ? "hidden" : ""}`}>
                            <i className='bx bxs-crown' ></i>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {currentRoom !== "" &&
                      <button
                        className={`p-2 rounded-lg cursor-pointer bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton} ${players.length > 0 && localStorage.getItem("user") !== players[0].name ? "hidden" : ""}`}
                        onClick={startGame}
                      >
                        {!gameStarted ? "Start Game" : "Reset Game"}
                      </button>
                    }
                  </div>

                  {/* <h2 className={`${theme[currentTheme].colorTextPrimary}`}>
                    Players:
                  </h2>
                  <ul className={`${theme[currentTheme].colorTextPrimary}`}>
                    {players.map((player, index) => (
                      <li key={player.id}>
                        Player {index + 1}: {player.name}
                      </li>
                    ))}
                  </ul> */}
                  {/* <h3 className={`${theme[currentTheme].colorTextPrimary}`}>
                    Player Turn:{" "}
                    {players.find((player) => player.id === currentPlayer)
                      ?.name || "None"}
                  </h3> */}
                </div>
              )}
              {/* {!gameStarted && (
                <div className="room-selection mb-4">
                  <button
                    className={`p-2 rounded-lg cursor-pointer  bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton}`}
                    onClick={() => handleRoomChange("room_1")}
                  >
                    Room 1
                  </button>
                  <button
                    className={`p-2 rounded-lg cursor-pointer  bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton}`}
                    onClick={() => handleRoomChange("room_2")}
                  >
                    Room 2
                  </button>
                </div>
              )} */}

              {gameStarted &&
                <>
                  <div className="card-grid cursor-pointer">
                    {cards.map((card) => (
                      <SingleCard
                        key={card.id}
                        card={card}
                        handleChoice={handleChoice}
                        flipped={card.flipped || card.matched}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                  <br />
                  <h3 className={`${theme[currentTheme].colorTextPrimary}`}>
                    Player Turn:{" "}
                    {players.find((player) => player.id === currentPlayer)?.name ||
                      "None"}
                  </h3>
                  <p className={`${theme[currentTheme].colorTextPrimary}`}>
                    Turns: {turns}
                  </p>
                </>
              }
            </>
          )}
        </div>

        {gameStarted &&
          <div className="main-chat-container shadow-xl h-fit mt-6">
            <div
              className={`players-container ${theme[currentTheme].bgColorHeader} p-3 rounded-ss-xl rounded-se-xl flex gap-3`}
            >
              {players.map((player, index) => (
                <div
                  key={index}
                  className={`box  bg-pink-700 hover:bg-pink-800 ${theme[currentTheme].bgColorPlayer} w-1/2 p-2 rounded-lg shadow-lg`}
                >
                  <p
                    className={`text-sm font-semibold  ${theme[currentTheme].colorTextPrimary}`}
                  >
                    Player {index + 1}: {player.name}
                  </p>
                  <p
                    className={`text-sm font-semibold ${theme[currentTheme].colorTextPrimary}`}
                  >
                    Score: {player.score || 0}
                  </p>
                </div>
              ))}
            </div>
            <div
              className={`chat-container flex-col max-h-[400px] ${theme[currentTheme].bgColorChat} overflow-auto`}
            >
              <div
                className={`chat-view p-5 overflow-auto ${theme[currentTheme].bgColorChat}`}
              >
                {messages.map((message, index) => {
                  if (message.sender === localStorage.getItem("user")) {
                    return (
                      <div
                        className={"flex items-start gap-2.5 justify-end mb-2"}
                        key={index}
                      >
                        <div
                          className={`flex flex-col max-w-[250px] leading-1.5 pt-3 pb-2 px-3 border-gray-200 rounded-s-xl rounded-ee-xl ${theme[currentTheme].bgColorBubChat1}`}
                        >
                          <div className="flex items-end space-x-2 rtl:space-x-reverse">
                            <span
                              className={`text-sm font-semibold ${theme[currentTheme].colorTextPrimary}`}
                            >
                              {message.sender}
                            </span>
                          </div>
                          <p
                            className={`text-sm font-normal py-2.5 light:text-gray-900 ${theme[currentTheme].colorTextPrimary}`}
                          >
                            {message.text}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-start gap-2.5 mb-2" key={index}>
                      <div
                        className={`flex flex-col max-w-[250px] leading-1.5 pt-3 pb-2 px-3 border-gray-200 rounded-e-xl rounded-es-xl ${theme[currentTheme].bgColorBubChat2}`}
                      >
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span
                            className={`text-sm font-semibold light:text-gray-900 ${theme[currentTheme].colorTextPrimary}`}
                          >
                            {message.sender}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-normal py-2.5 light:text-gray-900 ${theme[currentTheme].colorTextPrimary}`}
                        >
                          {message.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className={`input-chat ${theme[currentTheme].bgColorHeader} p-3 h-fit rounded-es-xl rounded-ee-xl`}
            >
              <form className="flex max-w-md gap-2">
                <TextInput
                  id="chat"
                  type="text"
                  placeholder="type here.."
                  value={sen}
                  onChange={(event) => {
                    setSen(event.target.value);
                  }}
                  className="w-full"
                />
                <div
                  onClick={handleSendMessage}
                  className={`p-3 py-1 rounded-lg flex items-center cursor-pointer ${theme[currentTheme].bgColorButton} ${theme[currentTheme].colorTextButton}  bg-pink-700 hover:bg-pink-800`}
                >
                  <i className="bx bxs-paper-plane text-base"></i>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    </>
  );
}
