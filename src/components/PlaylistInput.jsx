import { memo } from "react";
import AddToPlaylist from "./AddToPlaylist";
import "./PlaylistInput.css";

const PlaylistInput = memo(() => {
    return (
        <div className="playlist-input">
            <div className="playlist-input-header">
                <h3>플레이리스트에 추가</h3>
            </div>

            <div className="playlist-input-content">
                <div className="tab-content-wrapper">
                    <AddToPlaylist />
                </div>
            </div>
        </div>
    );
});

PlaylistInput.displayName = "PlaylistInput";

export default PlaylistInput;
