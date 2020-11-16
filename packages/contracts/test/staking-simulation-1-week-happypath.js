/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');

const StakingRewards = artifacts.require('StakingRewards');

const { toWei } = web3.utils;

const deploy = async (accounts) => {
    // initialize test setup
    const setup = await helpers.setup.initialize(accounts[0]);
    // deploy ERC20s
    setup.tokens = await helpers.setup.tokens(setup);
    // deploy DAOStack meta-contracts
    setup.DAOStack = await helpers.setup.DAOStack(setup);
    // deploy organization
    setup.organization = await helpers.setup.organization(setup);
    // deploy balancer infrastructure
    setup.balancer = await helpers.setup.balancer(setup);
    // deploy token4rep
    setup.token4rep = await helpers.setup.token4rep(setup);
    // deploy incentives contract
    setup.incentives = await helpers.setup.incentives(setup);
    // deploy primeDAO governance
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('Staking: 1 week happypath', (accounts) => {
    let setup;
    let stakeAmount;
    let halfStake;
    let quarterStake;
    let irregularStake;
    let irregularStake2;
    let tinyStake;
    let _initreward = (BigInt(925 * 100 * 1000000000000000000)).toString(); // "92500000000000002949500"
    let _starttime = 1600560000; // 2020-09-20 00:00:00 (UTC +00:00)
    let _durationDays = 7;

    let earned;
    let earned2;
    let earned3;
    let earned4;
    let earned5;
    let earned6;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });
    context('# multi-user simulation: 7 day DURATION', async () => {
        context('happypath: stake => getReward => exit', async () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                halfStake = toWei('50');
                quarterStake = toWei('25');
                irregularStake = toWei('33');
                irregularStake2 = toWei('76');
                tinyStake = toWei('9');
            });
            context('» stake', async () => {
                before('!! fund users + fund & initialize contract', async () => {
                    /* different amounts */
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await setup.balancer.pool.transfer(accounts[2], halfStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, halfStake, { from: accounts[2] });
                    await setup.balancer.pool.transfer(accounts[3], quarterStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, quarterStake, { from: accounts[3] });
                    await setup.balancer.pool.transfer(accounts[4], irregularStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, irregularStake, { from: accounts[4] });
                    await setup.balancer.pool.transfer(accounts[5], irregularStake2);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, irregularStake2, { from: accounts[5] });
                    await setup.balancer.pool.transfer(accounts[6], tinyStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, tinyStake, { from: accounts[6] });

                    /* amount doubles */
                    await setup.balancer.pool.transfer(accounts[7], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[7] });
                    await setup.balancer.pool.transfer(accounts[8], halfStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, halfStake, { from: accounts[8] });
                    await setup.balancer.pool.transfer(accounts[9], quarterStake);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, quarterStake, { from: accounts[9] });

                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('multiple users stake entire bPrime balance', async () => {
                    expect((await setup.incentives.stakingRewards.rewardPerTokenStored()).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));

                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    await setup.incentives.stakingRewards.stake(halfStake, { from: accounts[2] });
                    await setup.incentives.stakingRewards.stake(quarterStake, { from: accounts[3] });
                    await setup.incentives.stakingRewards.stake(irregularStake, { from: accounts[4] });
                    await setup.incentives.stakingRewards.stake(irregularStake2, { from: accounts[5] });
                    await setup.incentives.stakingRewards.stake(tinyStake, { from: accounts[6] });

                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[7] });
                    await setup.incentives.stakingRewards.stake(halfStake, { from: accounts[8] });
                    await setup.incentives.stakingRewards.stake(quarterStake, { from: accounts[9] });
                });
                it('user & pool balances are correct', async () => {
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('468')); // 468 = total stakes provided

                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[2])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[3])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[4])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[5])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[6])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[7])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[8])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[9])).toString()).to.equal('0');
                });
            });
            context('» day 2: getReward', async () => {
                it('users rewards are proportional to their stake', async () => {
                    await time.increase(time.duration.days(2));

                    let earnedReward = BigNumber(await setup.incentives.stakingRewards.earned(accounts[1]));
                    let earnedReward2 = BigNumber(await setup.incentives.stakingRewards.earned(accounts[2]));
                    let earnedReward3 = BigNumber(await setup.incentives.stakingRewards.earned(accounts[3]));
                    let earnedReward5 = BigNumber(await setup.incentives.stakingRewards.earned(accounts[5]));

                    let halfReward = earnedReward.dividedBy(2);
                    let quarterReward = earnedReward.dividedBy(4);
                    let irregReward = (earnedReward.dividedBy(100).multipliedBy(76));

                    expect(halfReward.toFixed(18)).to.equal(earnedReward2.toFixed(18));
                    expect(quarterReward.toFixed(18)).to.equal(earnedReward3.toFixed(18));
                    expect(irregReward.toFixed(18)).to.equal(earnedReward5.toFixed(18));
                });
                it('users 1 - 6 can claim their PRIME rewards whilst keeping tokens staked', async () => {
                    earned = (await setup.incentives.stakingRewards.earned(accounts[1])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[1] } );

                    earned2 = (await setup.incentives.stakingRewards.earned(accounts[2])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[2] } );

                    earned3 = (await setup.incentives.stakingRewards.earned(accounts[3])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[3] } );

                    earned4 = (await setup.incentives.stakingRewards.earned(accounts[4])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[4] } );

                    earned5 = (await setup.incentives.stakingRewards.earned(accounts[5])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[5] } );

                    earned6 = (await setup.incentives.stakingRewards.earned(accounts[6])).toString();
                    await setup.incentives.stakingRewards.getReward( { from: accounts[6] } );

                    await time.increase(time.duration.hours(1));
                });
                it('user PRIME balances are correct', async () => {
                    let balance = (await setup.tokens.primeToken.balanceOf(accounts[1])).toString();
                    expect(earned).to.equal(balance);

                    let balance2 = (await setup.tokens.primeToken.balanceOf(accounts[2])).toString();
                    expect(earned2).to.equal(balance2);

                    let balance3 = (await setup.tokens.primeToken.balanceOf(accounts[3])).toString();
                    expect(earned3).to.equal(balance3);

                    let balance4 = (await setup.tokens.primeToken.balanceOf(accounts[4])).toString();
                    expect(earned4).to.equal(balance4);

                    let balance5 = (await setup.tokens.primeToken.balanceOf(accounts[5])).toString();
                    expect(earned5).to.equal(balance5);

                    let balance6 = (await setup.tokens.primeToken.balanceOf(accounts[6])).toString();
                    expect(earned6).to.equal(balance6);
                });
                it('user and contract bPRIME balances are correct', async () => {
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[2])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[3])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[4])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[5])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[6])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[7])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[8])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(accounts[9])).toString()).to.equal('0');
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('468')); // 468 = total stakes provided
                });
            });
            context('» day 7: exit', () => {
                it('users exit with correct bPrime balances', async () => {

                    await time.increase(time.duration.days(5));

                    await setup.incentives.stakingRewards.exit( {from: accounts[1]} );
                    let bPrimeBalance1 = (await setup.balancer.pool.balanceOf(accounts[1])).toString();
                    expect(bPrimeBalance1).to.equal(stakeAmount);

                    await setup.incentives.stakingRewards.exit( {from: accounts[2]} );
                    let bPrimeBalance2 = (await setup.balancer.pool.balanceOf(accounts[2])).toString();
                    expect(bPrimeBalance2).to.equal(halfStake);

                    await setup.incentives.stakingRewards.exit( {from: accounts[3]} );
                    let bPrimeBalance3 = (await setup.balancer.pool.balanceOf(accounts[3])).toString();
                    expect(bPrimeBalance3).to.equal(quarterStake);

                    await setup.incentives.stakingRewards.exit( {from: accounts[4]} );
                    let bPrimeBalance4 = (await setup.balancer.pool.balanceOf(accounts[4])).toString();
                    expect(bPrimeBalance4).to.equal(irregularStake);

                    await setup.incentives.stakingRewards.exit( {from: accounts[5]} );
                    let bPrimeBalance5 = (await setup.balancer.pool.balanceOf(accounts[5])).toString();
                    expect(bPrimeBalance5).to.equal(irregularStake2);

                    await setup.incentives.stakingRewards.exit( {from: accounts[6]} );
                    let bPrimeBalance6 = (await setup.balancer.pool.balanceOf(accounts[6])).toString();
                    expect(bPrimeBalance6).to.equal(tinyStake);

                    await setup.incentives.stakingRewards.exit( {from: accounts[7]} );
                    let bPrimeBalance7 = (await setup.balancer.pool.balanceOf(accounts[7])).toString();
                    expect(bPrimeBalance7).to.equal(stakeAmount);

                    await setup.incentives.stakingRewards.exit( {from: accounts[8]} );
                    let bPrimeBalance8 = (await setup.balancer.pool.balanceOf(accounts[8])).toString();
                    expect(bPrimeBalance8).to.equal(halfStake);

                    await setup.incentives.stakingRewards.exit( {from: accounts[9]} );
                    let bPrimeBalance9 = (await setup.balancer.pool.balanceOf(accounts[9])).toString();
                    expect(bPrimeBalance9).to.equal(quarterStake);
                });
                it('Contract bPRIME balance == 0', async () => {
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal('0'); // all stake removed
                });
                it('reduction in stakingRewards prime balance == ~total reward payout amount', async () => {
                    let remainingPrimeBalance = BigNumber(await setup.tokens.primeToken.balanceOf(setup.incentives.stakingRewards.address));

                    /*
                    * Remaining token balance is: ~190000 if everyone calls exit() on day 7 (which considering we're using an 18 decimal token is fractional)
                    *                             ~13213979828042328659724 if everyone calls exit() on day 6
                    *                             ~26428265542328043366944 if everyone calls exit() on day 5
                    */
                    console.log('            remainingPrimeBalance: ' + remainingPrimeBalance.toString() + '/92500000000000002949500');

                    let balance = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[1]));
                    let balance2 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[2]));
                    let balance3 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[3]));
                    let balance4 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[4]));
                    let balance5 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[5]));
                    let balance6 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[6]));
                    let balance7 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[7]));
                    let balance8 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[8]));
                    let balance9 = BigNumber(await setup.tokens.primeToken.balanceOf(accounts[9]));

                    let payout = BigNumber(balance.plus(balance2).plus(balance3).plus(balance4).plus(balance5).plus(balance6).plus(balance7).plus(balance8).plus(balance9)).toFixed(18);
                    expect( (BigNumber(_initreward).minus(payout)).toFixed(18) ).to.equal(remainingPrimeBalance.toFixed(18));
                });
            });
        });
    });
});
