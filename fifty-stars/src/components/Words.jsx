import { Fragment } from 'react';
import { motion } from 'framer-motion';

const EMOJI = /\p{Extended_Pictographic}/u;
const EASE = [0.22, 1, 0.36, 1];

/**
 * Text that arrives word by word, drifting up out of a soft blur.
 * Emoji are kept out of gradient text so they always render in colour.
 */
export default function Words({
  text,
  className = '',
  wordClass = '',
  delay = 0,
  stagger = 0.09,
  duration = 0.9,
  y = 16,
  blur = 10,
  scale = 1,
  show = true,
  as: Tag = 'span',
  style,
}) {
  const words = text.split(' ');
  return (
    <Tag className={className} style={style}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <motion.span
            className={`inline-block ${EMOJI.test(word) ? 'emoji' : wordClass}`}
            initial={{ opacity: 0, y, scale, filter: `blur(${blur}px)` }}
            animate={show ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : { opacity: 0, y, scale, filter: `blur(${blur}px)` }}
            transition={{ delay: show ? delay + i * stagger : 0, duration: show ? duration : 0.4, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
