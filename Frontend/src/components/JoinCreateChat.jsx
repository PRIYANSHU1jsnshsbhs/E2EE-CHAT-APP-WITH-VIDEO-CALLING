import { useState } from "react";
import toast from "react-hot-toast";
import { createRoomAPI, joinChatAPI } from "../services/RoomService";
import useChatContext from "../context/chatContext.jsx";
import { useNavigate } from "react-router";
import { Particles } from "./ui/particles";
import { Globe } from "./ui/globe";

export default function JoinCreateChat() {
  const [detail, setDetail] = useState({
    roomId: "",
    userName: "",
  });

  const { setRoomId, setCurrentUser, setConnected } =
    useChatContext();

  const navigate = useNavigate();

  const handleChange = (e) => {
    setDetail({
      ...detail,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    if (!detail.roomId || !detail.userName) {
      toast.error("Please fill all fields");
      return false;
    }

    return true;
  };

  async function joinRoom() {
    if (!validate()) return;

    try {
      const room = await joinChatAPI(detail.roomId);

      setCurrentUser(detail.userName);
      setRoomId(room.roomId);
      setConnected(true);

      toast.success("Connected");

      navigate("/chat");
    } catch (err) {
      toast.error("Unable to join room");
    }
  }

  async function createRoom() {
    if (!validate()) return;

    try {
      const room = await createRoomAPI(detail.roomId);

      setCurrentUser(detail.userName);
      setRoomId(room.roomId);
      setConnected(true);

      toast.success("Room Created");

      navigate("/chat");
    } catch (err) {
      toast.error("Room already exists");
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">

      <Particles
        quantity={1000}
        color="#d4d4d4"
        className="absolute inset-0"
      />

      <div className="relative z-20 flex h-full items-center justify-between px-24">

        <div className="w-full max-w-lg">

          <div
            className="
            rounded-3xl
            bg-black/10
            backdrop-transparent
            p-10
            transition
            duration-500
            hover:border-lime-400/40
            "
          >

            <div className="mb-8">

              <p className="text-xs tracking-[0.45em] uppercase text-lime-400">
                ● ENCRYPTED SESSION
              </p>

              <h1
                className="
                mt-4
                text-6xl
                font-black
                tracking-[0.18em]
                text-lime-400
                "
                style={{ fontFamily: "Orbitron" }}
              >
                ENIGMATIC
              </h1>

            </div>

            <div className="space-y-6">

              <div>

                <label className="mb-2 block text-sm font-medium text-lime-300" style={{ fontFamily: "Orbitron" }}>
                  USER NAME
                </label>

                <input
                  type="text"
                  name="userName"
                  value={detail.userName}
                  onChange={handleChange}
                  placeholder="Enter your identity"
                  className="
                  w-full
                  rounded-xl
                  border
                  border-lime-400/20
                  bg-black/20
                  px-5
                  py-4
                  text-white
                  placeholder:text-gray-500
                  outline-none
                  transition
                  focus:border-lime-400
                  " style={{ fontFamily: "Orbitron" }}
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-lime-300" style={{ fontFamily: "Orbitron" }}>
                  ROOM ID
                </label>

                <input
                  type="text"
                  name="roomId"
                  value={detail.roomId}
                  onChange={handleChange}
                  placeholder="Secure Room Identifier"
                  className="
                  w-full
                  rounded-xl
                  border
                  border-lime-400/20
                  bg-black/20
                  px-5
                  py-4
                  text-white
                  placeholder:text-gray-500
                  outline-none
                  transition
                  focus:border-lime-400
                  " style={{ fontFamily: "Orbitron" }}
                />

              </div>

            </div>

            <div className="mt-10 flex gap-5">

              <button
                onClick={joinRoom}
                className="
                rounded-xl
                bg-lime-400
                px-8
                py-4
                font-semibold
                text-black
                transition
                duration-300
                hover:scale-105
                hover:bg-lime-300
                hover:shadow-[0_0_30px_#8bff00]
                " style={{ fontFamily: "Orbitron" }}
              >
                Join Room
              </button>

              <button
                onClick={createRoom}
                className="
                rounded-xl
                border
                border-lime-400
                bg-transparent
                px-8
                py-4
                font-semibold
                text-lime-400
                transition
                duration-300
                hover:scale-105
                hover:bg-lime-400/10
                " style={{ fontFamily: "Orbitron" }}
              >
                Create Room
              </button>

            </div>

            <div className="mt-8 pt-6">

            </div>

          </div>

        </div>

        <Globe />

      </div>

    </div>
  );
}