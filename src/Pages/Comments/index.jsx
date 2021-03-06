import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { saveComments, clearComments } from "../../store/User/actions";
import { getClient } from "../../lib/igClient";
import "simplebar/dist/simplebar.min.css";

import styles from "./styles.module.scss";
import CloseIcon from "../../images/down-arrow.svg";
import SendIcon from "../../images/direct.svg";
import Toggle from "../../components/Toggle";
import MuteIcon from "../../images/mute.svg";

function Comments({
  broadcastId,
  comments,
  dispatch,
  profile,
  open,
  clickClose,
}) {
  const [isMuted, setMuted] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [userComment, setUserComment] = useState('');
  const [isCommenting, setCommenting] = useState(false);
  const client = getClient();
  let lastCommentTs = comments && comments.length>0? comments[0].created_at : 0;

  const startComments = async () => {
    setInProgress(true);
    console.log("Starting to refresh comments....");
    window.refreshInterval = setInterval(() => {
      fetchComments();
    }, 2000);
    console.log(`Refresh ID: ${window.refreshInterval}`);
    setInProgress(false);
  };

  const stopComments = async () => {
    setInProgress(true);
    if (window.refreshInterval) {
      clearInterval(window.refreshInterval);
      window.refreshInterval = null;
    }
    setInProgress(false);
  };

  const fetchComments = async () => {
    try {
      const { comments } = await client.live.getComment({
        broadcastId,
        lastCommentTs,
      });
      if (comments && comments.length > 0) {
        setCommenting(false);
        comments.forEach((comment) => console.log({ comment }));
        const newLastCommentTs = comments[0].created_at;
        lastCommentTs = newLastCommentTs;
        dispatch(saveComments(comments));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addComment = async () => {
    console.log("adding comments...");
    const comment = userComment;
    // do not comment, if there is no comment text available
    if (!(comment && comment.length > 0)) return;
    setUserComment('')
    setCommenting(true);
    await client.live.comment(broadcastId, comment);
  }

  const toggleComments = async () => {
    try {
      if (!isMuted) {
        stopComments();
        client.live.muteComment(broadcastId);
        setMuted(true);
      } else {
        startComments();
        client.live.unmuteComment(broadcastId);
        setMuted(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isMuted && !window.refreshInterval) {
      console.log("Starting comments from emtpty hook");
      startComments();
    }
    return () => {
      // stop refreshing the comments
      stopComments();
      dispatch(clearComments());
    };
  }, []);

  const renderComments = (comments) => {
    return comments.map((comment) => (
      <div key={comment.pk} className={styles.comment}>
        <img className={styles.profilePic} src={comment.user.profile_pic_url} />
        <div className={styles.textContainer}>
          <h4 className={styles.title}>{comment.user.username}</h4>
          <p className={styles.text}>{comment.text}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className={`${styles.commentsScreen} ${!open ? styles.close : ""}`}>
      <div className={styles.header}>
        <img src={profile.profile_pic_url} className={styles.headerIcon} />
        <h2 className={styles.title}>Comments</h2>
        {!inProgress ? (
          <Toggle
            checked={!isMuted}
            onChange={() => {
              toggleComments();
            }}
            disabled={inProgress}
          />
        ) : (
          <></>
        )}
        <img
          src={CloseIcon}
          className={styles.closeIcon}
          onClick={() => clickClose()}
        ></img>
      </div>
      {isMuted ? (
        <div className={styles.commentsDiabled}>
          <img src={MuteIcon} className={styles.muteIcon} />
          <p className={styles.description}>
            Comments are muted. Click on unmute comments to enable comments
          </p>
          {/* <Button buttontype="rounded">Unmute Comments</Button> */}
        </div>
      ) : (
        <>
          <div className={styles.comments}>{renderComments(comments)}</div>

          <form className={styles.commentBox} onSubmit={(e) => {
            e.preventDefault();
            addComment();
          }}>
            <input type="text" className={styles.commentInput} value={userComment} onChange={(e) => setUserComment(e.target.value)} placeholder={isCommenting? "Loading...":"Press enter to send"}/>
            <button className={styles.sendButton} type="submit">
              <img src={SendIcon} alt="" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

const mapStateToProps = function (state) {
  return {
    profile: state.user.profile,
    comments: state.instagram.comments,
  };
};

export default connect(mapStateToProps)(Comments);
