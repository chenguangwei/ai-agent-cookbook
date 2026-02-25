import client from './tina/__generated__/client.js';

async function test() {
    const res = await client.queries.tutorialConnection({ last: 1 });
    console.log(res.data.tutorialConnection.edges[0].node.thumbnail);
}
test().catch(console.error);
